# server/bot/discord_bot.py
import os
import logging
import asyncio
import json
import aiohttp
import discord
from discord import app_commands
from discord.ext import commands

API_BASE = os.getenv("API_BASE", "http://localhost:8000")  # where your FastAPI runs
DISCORD_TOKEN = os.getenv("DISCORD_TOKEN")

intents = discord.Intents.default()
intents.message_content = True
bot = commands.Bot(command_prefix="!", intents=intents)
logger = logging.getLogger(__name__)

@bot.event
async def on_ready():
    logger.info(f"Logged in as {bot.user} (id: {bot.user.id})")

class Evaluate(app_commands.Group):
    @app_commands.command(name="idea")
    async def idea(self, interaction: discord.Interaction, description: str):
        """Evaluate an idea and optionally create a survey."""
        await interaction.response.defer(thinking=True)
        payload = {"user_id": str(interaction.user.id), "description": description}
        async with aiohttp.ClientSession() as session:
            async with session.post(f"{API_BASE}/ideas/evaluate", json=payload) as resp:
                if resp.status != 200:
                    text = await resp.text()
                    await interaction.followup.send(f"API error: {resp.status} {text}")
                    return
                data = await resp.json()
        eval_report = data["evaluation"]
        embed = discord.Embed(title="Idea evaluation", description=description[:2000])
        embed.add_field(name="Feasibility", value=eval_report.get("feasibility", "N/A"), inline=False)
        embed.add_field(name="Market demand", value=eval_report.get("market_demand", "N/A"), inline=False)
        embed.add_field(name="Score", value=str(eval_report.get("overall_score", 0)), inline=True)
        # Refinements as bullet list
        refinements = eval_report.get("refinements", [])
        embed.add_field(name="Refinements", value="\n".join(f"- {r}" for r in refinements), inline=False)

        # send with buttons
        view = discord.ui.View()
        async def create_survey_callback(interaction2: discord.Interaction):
            # create DB survey row via API then post pinned message
            async with aiohttp.ClientSession() as s2:
                payload2 = {"idea_id": data["idea_id"], "channel_id": str(interaction.channel.id), "title": description[:200]}
                async with s2.post(f"{API_BASE}/surveys", json=payload2) as r2:
                    if r2.status != 200:
                        await interaction2.response.send_message("Failed to create survey", ephemeral=True)
                        return
                    survey_data = await r2.json()
            # post survey message with buttons
            msg_view = discord.ui.View()
            class VoteButton(discord.ui.Button):
                def __init__(self, label, value):
                    super().__init__(style=discord.ButtonStyle.secondary, label=label)
                    self.value = value
                async def callback(self, i: discord.Interaction):
                    # call API record vote
                    async with aiohttp.ClientSession() as s3:
                        payload3 = {"survey_id": survey_data["id"], "user_id": str(i.user.id), "response": self.value}
                        async with s3.post(f"{API_BASE}/surveys/response", json=payload3) as r3:
                            if r3.status != 200:
                                await i.response.send_message("Failed to record vote", ephemeral=True)
                                return
                    await i.response.send_message("Thanks for your vote!", ephemeral=True)
            msg_view.add_item(VoteButton("👍 Yes", "yes"))
            msg_view.add_item(VoteButton("🤔 Maybe", "maybe"))
            msg_view.add_item(VoteButton("👎 No", "no"))

            posted = await interaction.channel.send(content=f"Survey: {description[:400]}", view=msg_view)
            try:
                await posted.pin()
            except Exception:
                logger.exception("Failed to pin message")
            # update survey message_id via API (optional)
            async with aiohttp.ClientSession() as s4:
                await s4.post(f"{API_BASE}/surveys", json={"idea_id": data["idea_id"], "channel_id": str(interaction.channel.id), "message_id": str(posted.id)})

            await interaction2.response.send_message("Survey created and pinned.", ephemeral=True)

        view.add_item(discord.ui.Button(label="Create pinned survey", style=discord.ButtonStyle.primary, custom_id="create_survey"))
        # map custom id to callback using an interaction listener
        async def on_interaction_create_survey(payload_interaction):
            # this is a rough handler; discord.py handles view callbacks more directly via Button subclass above
            pass

        # a simpler approach: add a button with a callback via subclass
        class CreateSurveyButton(discord.ui.Button):
            def __init__(self):
                super().__init__(style=discord.ButtonStyle.primary, label="Create pinned survey")
            async def callback(self, i: discord.Interaction):
                await create_survey_callback(i)

        # rebuild view with proper callback
        view = discord.ui.View()
        view.add_item(CreateSurveyButton())

        await interaction.followup.send(embed=embed, view=view)

# Run the bot
if __name__ == "__main__":
    bot.run(DISCORD_TOKEN)
