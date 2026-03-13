"""
Casbin initialization utilities for FastAPI application.
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from src.db.session import engine
from src.apps.iam.casbin_enforcer import CasbinEnforcer


@asynccontextmanager
async def init_casbin(app: FastAPI):
    """
    Initialize Casbin enforcer on application startup.
    """
    enforcer = await CasbinEnforcer.get_enforcer(engine)
    app.state.casbin_enforcer = enforcer
    yield


async def setup_default_roles_and_permissions(session):
    """
    Seed the 4 core roles (owner, manager, tenant, user) with their default
    permissions. Safe to call multiple times — skips if roles already exist.
    """
    from src.apps.iam.models import Role, Permission
    from src.apps.iam.utils.rbac import assign_permission_to_role
    from src.apps.iam.enums import ResourceEnum, ActionEnum, RoleNameEnum
    from sqlmodel import select

    result = await session.execute(select(Role))
    existing_roles = result.scalars().all()
    if existing_roles:
        return  # already seeded

    # ── Create roles ─────────────────────────────────────────────────────────
    owner_role = Role(
        name=RoleNameEnum.owner,
        description="Ground owner — can create/manage grounds and assign manager/tenant roles"
    )
    manager_role = Role(
        name=RoleNameEnum.manager,
        description="Ground manager — can manage bookings, staff, and add tenants (ground-scoped)"
    )
    tenant_role = Role(
        name=RoleNameEnum.tenant,
        description="Ground tenant — day-to-day ground operations (ground-scoped)"
    )
    user_role = Role(
        name=RoleNameEnum.user,
        description="Regular consumer — can browse grounds, make bookings, leave reviews"
    )

    session.add_all([owner_role, manager_role, tenant_role, user_role])
    await session.commit()
    for r in (owner_role, manager_role, tenant_role, user_role):
        await session.refresh(r)

    # ── Create permissions ────────────────────────────────────────────────────
    def _perm(resource: ResourceEnum, action: ActionEnum, desc: str) -> Permission:
        return Permission(resource=resource, action=action, description=desc)

    R, A = ResourceEnum, ActionEnum

    # owner permissions — full access to all resources
    owner_perms = [
        _perm(R.grounds,       A.manage, "Owner: full ground management"),
        _perm(R.bookings,      A.manage, "Owner: full booking management"),
        _perm(R.staff,         A.manage, "Owner: manage staff/team"),
        _perm(R.payments,      A.manage, "Owner: manage payments"),
        _perm(R.payouts,       A.manage, "Owner: manage payouts"),
        _perm(R.reports,       A.read,   "Owner: view reports"),
        _perm(R.reviews,       A.manage, "Owner: manage reviews"),
        _perm(R.settings,      A.manage, "Owner: manage ground settings"),
        _perm(R.subscriptions, A.read,   "Owner: view subscription info"),
        _perm(R.users,         A.read,   "Owner: view users"),
    ]

    # manager permissions — operational access within a ground
    manager_perms = [
        _perm(R.grounds,  A.read,   "Manager: view ground details"),
        _perm(R.bookings, A.manage, "Manager: full booking management"),
        _perm(R.staff,    A.write,  "Manager: add staff"),
        _perm(R.payments, A.read,   "Manager: view payments"),
        _perm(R.reports,  A.read,   "Manager: view reports"),
        _perm(R.reviews,  A.read,   "Manager: view reviews"),
        _perm(R.settings, A.read,   "Manager: view settings"),
    ]

    # tenant permissions — day-to-day operations
    tenant_perms = [
        _perm(R.grounds,  A.read,   "Tenant: view ground details"),
        _perm(R.bookings, A.write,  "Tenant: create/update bookings"),
        _perm(R.bookings, A.read,   "Tenant: read bookings"),
        _perm(R.payments, A.read,   "Tenant: view payments"),
        _perm(R.reviews,  A.read,   "Tenant: view reviews"),
    ]

    # user permissions — consumer access
    user_perms = [
        _perm(R.grounds,  A.read,  "User: browse grounds"),
        _perm(R.bookings, A.write, "User: make a booking"),
        _perm(R.bookings, A.read,  "User: view own bookings"),
        _perm(R.reviews,  A.write, "User: submit reviews"),
        _perm(R.reviews,  A.read,  "User: read reviews"),
    ]

    all_perms = owner_perms + manager_perms + tenant_perms + user_perms
    session.add_all(all_perms)
    await session.commit()
    for p in all_perms:
        await session.refresh(p)

    # ── Assign permissions to roles ───────────────────────────────────────────
    assert owner_role.id and manager_role.id and tenant_role.id and user_role.id

    for p in owner_perms:
        assert p.id
        await assign_permission_to_role(owner_role.id, p.id, session)

    for p in manager_perms:
        assert p.id
        await assign_permission_to_role(manager_role.id, p.id, session)

    for p in tenant_perms:
        assert p.id
        await assign_permission_to_role(tenant_role.id, p.id, session)

    for p in user_perms:
        assert p.id
        await assign_permission_to_role(user_role.id, p.id, session)

    print("✅ RBAC seed: owner, manager, tenant, user roles + permissions created")

