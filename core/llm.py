"""
DeepSeek V3 API wrapper.
Uses OpenAI-compatible endpoint for DeepSeek.
"""

import json
from openai import AsyncOpenAI
from loguru import logger
import config


class DeepSeekClient:
    """Async wrapper for DeepSeek V3 API (OpenAI-compatible)."""

    def __init__(self):
        self.client = AsyncOpenAI(
            api_key=config.DEEPSEEK_API_KEY,
            base_url=config.DEEPSEEK_API_BASE
        )
        self.model = config.DEEPSEEK_MODEL

    async def complete(self, system: str, user: str) -> str:
        """
        Send a completion request to DeepSeek V3.
        Returns raw text response.
        """
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": user}
                ],
                max_tokens=config.DEEPSEEK_MAX_TOKENS,
                temperature=config.DEEPSEEK_TEMPERATURE
            )
            content = response.choices[0].message.content.strip()
            logger.debug(f"LLM response length: {len(content)} chars")
            return content
        except Exception as e:
            logger.error(f"DeepSeek API error: {e}")
            raise

    def parse_json(self, response: str) -> dict:
        """
        Parse JSON from LLM response.
        Handles common issues like markdown code blocks.
        """
        text = response.strip()

        # Remove markdown code block if present
        if text.startswith("```json"):
            text = text[7:]
        elif text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]

        text = text.strip()

        try:
            return json.loads(text)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse LLM JSON: {e} | raw={text[:200]}")
            raise ValueError(f"Invalid JSON from LLM: {e}")
