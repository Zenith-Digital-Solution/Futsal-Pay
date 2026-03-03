"""
RBAC API endpoints — roles, permissions, assignments and Casbin integration.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select, func, col
from src.db.session import get_session
from src.apps.iam.models import Role, Permission, User
from src.apps.iam.models.role import UserRole
from src.apps.iam.schemas.rbac import (
    RoleCreate,
    RoleResponse,
    PermissionCreate,
    PermissionResponse,
    RoleAssignment,
    PermissionAssignment,
    CheckPermissionResponse,
    UserRolesResponse,
    RolePermissionsResponse,
)
from src.apps.iam.utils.rbac import (
    assign_role_to_user,
    remove_role_from_user,
    assign_permission_to_role,
    remove_permission_from_role,
    get_user_roles,
    get_role_permissions,
    check_permission,
)
from src.apps.iam.casbin_enforcer import CasbinEnforcer
from src.apps.iam.utils.hashid import decode_id_or_404
from src.apps.core.schemas import PaginatedResponse
from src.apps.core.cache import RedisCache
from src.apps.iam.api.deps import (
    get_current_user,
    get_current_active_superuser,
    get_current_owner_or_superuser,
    get_db,
)
from src.apps.iam.enums import RoleNameEnum


router = APIRouter()


# ==== Role Management ====

@router.post("/roles", response_model=RoleResponse, status_code=status.HTTP_201_CREATED)
async def create_role(
    role_data: RoleCreate,
    session: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_active_superuser),
):
    """Create a new role. Superuser only."""
    role = Role(name=role_data.name, description=role_data.description)
    session.add(role)
    await session.commit()
    await session.refresh(role)
    await RedisCache.clear_pattern("roles:list:*")
    return role


@router.get("/roles", response_model=PaginatedResponse[RoleResponse])
async def list_roles(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=10, ge=1, le=100),
    session: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_owner_or_superuser),
):
    """List all roles with pagination."""
    cache_key = f"roles:list:{skip}:{limit}"
    cached = await RedisCache.get(cache_key)
    if cached:
        return cached

    total = (await session.execute(select(func.count(col(Role.id))))).scalar_one()
    items = (await session.execute(select(Role).offset(skip).limit(limit))).scalars().all()
    items_response = [RoleResponse.model_validate(r) for r in items]

    response = PaginatedResponse[RoleResponse].create(items=items_response, total=total, skip=skip, limit=limit)
    await RedisCache.set(cache_key, response.model_dump(), ttl=600)
    return response


@router.get("/roles/{role_id}", response_model=RoleResponse)
async def get_role(
    role_id: str,
    session: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_owner_or_superuser),
):
    """Get role details."""
    rid = decode_id_or_404(role_id)
    cache_key = f"role:{rid}"
    cached = await RedisCache.get(cache_key)
    if cached:
        return RoleResponse(**cached)

    role = await session.get(Role, rid)
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    response = RoleResponse.model_validate(role)
    await RedisCache.set(cache_key, response.model_dump(), ttl=900)
    return response


# ==== Permission Management ====

@router.post("/permissions", response_model=PermissionResponse, status_code=status.HTTP_201_CREATED)
async def create_permission(
    perm_data: PermissionCreate,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_owner_or_superuser),
):
    """Create a new permission. Superuser or owner (scoped to their ground)."""
    permission = Permission(
        resource=perm_data.resource,
        action=perm_data.action,
        description=perm_data.description,
        created_by_id=current_user.id,
        ground_id=perm_data.ground_id,
    )
    session.add(permission)
    await session.commit()
    await session.refresh(permission)
    await RedisCache.clear_pattern("permissions:list:*")
    return permission


@router.get("/permissions", response_model=PaginatedResponse[PermissionResponse])
async def list_permissions(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=10, ge=1, le=100),
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_owner_or_superuser),
):
    """List permissions. Superuser sees all; owner sees only their created permissions."""
    query = select(Permission)
    count_query = select(func.count(col(Permission.id)))

    if not current_user.is_superuser:
        # Owners only see permissions they created
        query = query.where(Permission.created_by_id == current_user.id)
        count_query = count_query.where(Permission.created_by_id == current_user.id)

    total = (await session.execute(count_query)).scalar_one()
    items = (await session.execute(query.offset(skip).limit(limit))).scalars().all()
    items_response = [PermissionResponse.model_validate(p) for p in items]

    return PaginatedResponse[PermissionResponse].create(items=items_response, total=total, skip=skip, limit=limit)


# ==== Role-User Assignment ====

@router.post("/users/assign-role", status_code=status.HTTP_200_OK)
async def assign_role(
    assignment: RoleAssignment,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_owner_or_superuser),
):
    """Assign a role to a user.
    
    - Superuser: can assign any role in any domain.
    - Owner: can only assign manager/tenant roles for their own grounds.
    """
    user_db_id = decode_id_or_404(assignment.user_id)
    role_db_id = decode_id_or_404(assignment.role_id)

    # Owners can only assign manager/tenant roles (ground-scoped)
    if not current_user.is_superuser:
        role = await session.get(Role, role_db_id)
        if not role or role.name not in (RoleNameEnum.manager, RoleNameEnum.tenant):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Owners can only assign manager or tenant roles"
            )
        if not assignment.domain.startswith("ground:"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A ground-scoped domain (ground:{id}) is required for manager/tenant roles"
            )

    user_role = await assign_role_to_user(
        user_id=user_db_id,
        role_id=role_db_id,
        session=session,
        domain=assignment.domain,
    )
    await RedisCache.clear_pattern(f"user:{user_db_id}:roles*")
    await RedisCache.delete(f"casbin:roles:{user_db_id}")
    return {"message": "Role assigned to user", "user_role_id": user_role.id}


@router.delete("/users/remove-role", status_code=status.HTTP_200_OK)
async def remove_role(
    assignment: RoleAssignment,
    session: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_owner_or_superuser),
):
    """Remove a role from a user."""
    user_db_id = decode_id_or_404(assignment.user_id)
    role_db_id = decode_id_or_404(assignment.role_id)
    result = await remove_role_from_user(
        user_id=user_db_id,
        role_id=role_db_id,
        session=session,
        domain=assignment.domain,
    )
    await RedisCache.clear_pattern(f"user:{user_db_id}:roles*")
    await RedisCache.delete(f"casbin:roles:{user_db_id}")
    return {"message": "Role removed from user", "success": result}


@router.get("/users/{user_id}/roles", response_model=UserRolesResponse)
async def get_user_roles_endpoint(
    user_id: str,
    session: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_owner_or_superuser),
):
    """Get all roles for a user."""
    uid = decode_id_or_404(user_id)
    cache_key = f"user:{uid}:roles"
    cached = await RedisCache.get(cache_key)
    if cached:
        return cached

    roles = await get_user_roles(uid, session)
    response = UserRolesResponse(
        user_id=uid,
        roles=[RoleResponse.model_validate(r) for r in roles],
    )
    await RedisCache.set(cache_key, response.model_dump(), ttl=300)
    return response


# ==== Permission-Role Assignment ====

@router.post("/roles/assign-permission", status_code=status.HTTP_200_OK)
async def assign_permission(
    assignment: PermissionAssignment,
    session: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_owner_or_superuser),
):
    """Assign a permission to a role."""
    role_db_id = decode_id_or_404(assignment.role_id)
    perm_db_id = decode_id_or_404(assignment.permission_id)
    role_permission = await assign_permission_to_role(
        role_id=role_db_id,
        permission_id=perm_db_id,
        session=session,
    )
    await RedisCache.clear_pattern(f"role:{role_db_id}:permissions*")
    return {"message": "Permission assigned to role", "role_permission_id": role_permission.id}


@router.delete("/roles/remove-permission", status_code=status.HTTP_200_OK)
async def remove_permission(
    assignment: PermissionAssignment,
    session: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_owner_or_superuser),
):
    """Remove a permission from a role."""
    role_db_id = decode_id_or_404(assignment.role_id)
    perm_db_id = decode_id_or_404(assignment.permission_id)
    result = await remove_permission_from_role(
        role_id=role_db_id,
        permission_id=perm_db_id,
        session=session,
    )
    await RedisCache.clear_pattern(f"role:{role_db_id}:permissions*")
    return {"message": "Permission removed from role", "success": result}


@router.get("/roles/{role_id}/permissions", response_model=RolePermissionsResponse)
async def get_role_permissions_endpoint(
    role_id: str,
    session: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_owner_or_superuser),
):
    """Get all permissions for a role."""
    rid = decode_id_or_404(role_id)
    cache_key = f"role:{rid}:permissions"
    cached = await RedisCache.get(cache_key)
    if cached:
        return cached

    permissions = await get_role_permissions(rid, session)
    response = RolePermissionsResponse(
        role_id=rid,
        permissions=[PermissionResponse.model_validate(p) for p in permissions],
    )
    await RedisCache.set(cache_key, response.model_dump(), ttl=300)
    return response


# ==== Permission Checking ====

@router.get("/check-permission/{user_id}", response_model=CheckPermissionResponse)
async def check_user_permission(
    user_id: str,
    resource: str,
    action: str,
    domain: str = Query(default="global", description="Domain ('global' or 'ground:{id}')"),
    session: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Check if a user has a specific permission in a domain."""
    uid = decode_id_or_404(user_id)
    cache_key = f"permission:check:{uid}:{domain}:{resource}:{action}"
    cached = await RedisCache.get(cache_key)
    if cached is not None:
        return cached

    has_permission = await check_permission(uid, resource, action, session, domain)
    response = CheckPermissionResponse(
        user_id=uid,
        resource=resource,
        action=action,
        allowed=has_permission,
    )
    await RedisCache.set(cache_key, response.model_dump(), ttl=120)
    return response


# ==== Casbin Direct Operations ====

@router.get("/casbin/roles/{user_id}")
async def get_casbin_roles(
    user_id: str,
    domain: str = Query(default="global"),
    _: User = Depends(get_current_owner_or_superuser),
):
    """Get roles from Casbin for a user in a domain."""
    uid = decode_id_or_404(user_id)
    cache_key = f"casbin:roles:{uid}:{domain}"
    cached = await RedisCache.get(cache_key)
    if cached:
        return cached

    roles = await CasbinEnforcer.get_roles_for_user(str(uid), domain)
    response = {"user_id": uid, "domain": domain, "roles": roles}
    await RedisCache.set(cache_key, response, ttl=300)
    return response


@router.get("/casbin/permissions/{user_id}")
async def get_casbin_permissions(
    user_id: str,
    domain: str = Query(default="global"),
    _: User = Depends(get_current_owner_or_superuser),
):
    """Get all permissions from Casbin for a user in a domain."""
    uid = decode_id_or_404(user_id)
    cache_key = f"casbin:permissions:{uid}:{domain}"
    cached = await RedisCache.get(cache_key)
    if cached:
        return cached

    permissions = await CasbinEnforcer.get_permissions_for_user(str(uid), domain)
    response = {"user_id": uid, "domain": domain, "permissions": permissions}
    await RedisCache.set(cache_key, response, ttl=300)
    return response


# ==== Ground Members ====

@router.get("/grounds/{ground_id}/members")
async def list_ground_members(
    ground_id: int,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_owner_or_superuser),
):
    """List all users with roles in a specific ground domain."""
    domain = f"ground:{ground_id}"
    result = await session.execute(
        select(User, Role, UserRole)
        .join(UserRole, UserRole.user_id == User.id)
        .join(Role, Role.id == UserRole.role_id)
        .where(UserRole.domain == domain)
    )
    rows = result.all()
    return {
        "ground_id": ground_id,
        "domain": domain,
        "members": [
            {
                "user_id": row.User.id,
                "username": row.User.username,
                "email": row.User.email,
                "role": row.Role.name,
                "assigned_at": row.UserRole.assigned_at,
            }
            for row in rows
        ],
    }


# ==== Create User With Role ====

from pydantic import BaseModel as _BaseModel, EmailStr

class CreateUserWithRoleRequest(_BaseModel):
    username: str
    email: EmailStr
    password: str
    first_name: str = ""
    last_name: str = ""
    role: RoleNameEnum
    # Required for manager/tenant; None for owner role
    ground_id: int | None = None


@router.post("/users/create-with-role", status_code=status.HTTP_201_CREATED)
async def create_user_with_role(
    payload: CreateUserWithRoleRequest,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_owner_or_superuser),
):
    """Create a new user and immediately assign them a role.
    
    - Superuser: can create owner, manager, or tenant accounts.
    - Owner: can only create manager or tenant accounts for their own grounds.
    """
    from src.apps.core import security as _security
    from src.apps.iam.models.user import UserProfile

    # Validate role assignment permissions
    if not current_user.is_superuser:
        if payload.role not in (RoleNameEnum.manager, RoleNameEnum.tenant):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Owners can only create manager or tenant accounts"
            )
        if not payload.ground_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="ground_id is required when creating manager/tenant accounts"
            )

    # Check username/email uniqueness
    existing = (await session.execute(
        select(User).where(
            (User.username == payload.username) | (User.email == payload.email)
        )
    )).scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username or email already registered"
        )

    new_user = User(
        username=payload.username,
        email=payload.email,
        hashed_password=_security.get_password_hash(payload.password),
        is_confirmed=True,
    )
    session.add(new_user)
    session.add(UserProfile(
        first_name=payload.first_name,
        last_name=payload.last_name,
        user=new_user,
    ))
    await session.commit()
    await session.refresh(new_user)

    # Look up role by name
    role_obj = (await session.execute(
        select(Role).where(Role.name == payload.role.value)
    )).scalar_one_or_none()
    if not role_obj:
        raise HTTPException(status_code=500, detail=f"Role '{payload.role}' not found in database")

    domain = f"ground:{payload.ground_id}" if payload.ground_id else "global"
    await assign_role_to_user(new_user.id, role_obj.id, session, domain=domain)

    return {
        "message": f"User created with role '{payload.role.value}'",
        "user_id": new_user.id,
        "username": new_user.username,
        "role": payload.role.value,
        "domain": domain,
    }

