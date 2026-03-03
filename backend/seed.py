"""
Standalone seed script — populates the 4 default roles + permissions.
Run with:  task seed   (or .venv/bin/python seed.py)

Must be run AFTER `task migrate` so all tables exist.
"""
import asyncio


async def main() -> None:
    # Import every model package so SQLAlchemy's mapper registry is fully
    # populated before we execute any query (same order as main.py routers).
    import src.apps.iam.models          # noqa: F401  User, Role, Permission …
    import src.apps.multitenancy.models # noqa: F401  Tenant …
    import src.apps.finance.models      # noqa: F401
    import src.apps.futsal.models       # noqa: F401  FutsalGround, Booking …
    import src.apps.payout.models       # noqa: F401
    import src.apps.subscription.models # noqa: F401
    import src.apps.notification.models # noqa: F401

    from src.db.session import get_session, engine
    from src.apps.iam.casbin_enforcer import CasbinEnforcer
    from src.apps.iam.casbin_init import setup_default_roles_and_permissions

    # Initialize Casbin enforcer (required by assign_permission_to_role)
    await CasbinEnforcer.get_enforcer(engine)

    async for session in get_session():
        await setup_default_roles_and_permissions(session)
        break


if __name__ == "__main__":
    asyncio.run(main())
