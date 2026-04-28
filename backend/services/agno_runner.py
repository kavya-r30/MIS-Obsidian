from agno.agent import Agent
from agno.models.mistral import MistralChat
from ..core.config import settings

def make_mistral_agent(tools: list, instructions: str, description: str) -> Agent:
    return Agent(
        model=MistralChat(id=settings.MISTRAL_MODEL, api_key=settings.MISTRAL_API_KEY, client_params={"timeout_ms": 30000}),
        tools=tools,
        description=description,
        instructions=[instructions],
        markdown=False,
    )
