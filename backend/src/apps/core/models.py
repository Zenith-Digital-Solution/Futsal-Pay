from typing import Optional
from sqlmodel import Field, SQLModel


class GeneralSetting(SQLModel, table=True):
    """Key-value store for runtime configuration overrides.

    Values here take precedence over the .env file.  Only string values are
    stored; the loader in config.py casts them to the correct Python type
    when overriding the Settings object.
    """

    __tablename__ = "generalsettings"

    key: str = Field(primary_key=True, max_length=255)
    value: str = Field(max_length=2048)
    description: Optional[str] = Field(default=None, max_length=512)
