from pydantic import BaseModel, field_serializer

from src.apps.iam.utils.hashid import encode_id


class LoyaltyAccountResponse(BaseModel):
    points_balance: int
    total_earned: int
    total_redeemed: int

    model_config = {"from_attributes": True}


class LoyaltyTransactionResponse(BaseModel):
    id: int
    transaction_type: str
    points: int
    description: str

    model_config = {"from_attributes": True}

    @field_serializer("id")
    def serialize_id(self, value: int) -> str:
        return encode_id(value)
