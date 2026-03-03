"""
RBAC enumerations for resources and actions.
These enums enforce consistent values across models, schemas, and Casbin policies.
"""
from enum import Enum


class ResourceEnum(str, Enum):
    grounds = "grounds"
    bookings = "bookings"
    reviews = "reviews"
    users = "users"
    staff = "staff"
    payments = "payments"
    reports = "reports"
    settings = "settings"
    subscriptions = "subscriptions"
    payouts = "payouts"


class ActionEnum(str, Enum):
    read = "read"
    write = "write"
    update = "update"
    delete = "delete"
    manage = "manage"


class RoleNameEnum(str, Enum):
    owner = "owner"
    manager = "manager"
    tenant = "tenant"
    user = "user"
