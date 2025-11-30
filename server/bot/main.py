import os
import logging
import aiohttp
import discord
from discord import app_commands
from discord.ext import commands

API_BASE = os.getenv("API_BASE", "http://localhost:8000")
DISCORD_TOKEN = os.getenv("DISCORD_TOKEN")

intents = discord.Intents.default()
intents.message_content = True
bot = commands.Bot(command_prefix="!", intents=intents)
logger = logging.getLogger(__name__)


# ---------------------------------------------------------
# Ready event
# ---------------------------------------------------------
@bot.event
async def on_ready():
    await bot.tree.sync()
    logger.info(f"Logged in as {bot.user} (id: {bot.user.id})")
    print("Slash commands synced.")


# ---------------------------------------------------------
# SLASH COMMAND GROUP: /evaluate
# ---------------------------------------------------------
class Evaluate(app_commands.Group):
    @app_commands.command(name="idea", description="Evaluate an idea and optionally create a survey.")
    async def idea(self, interaction: discord.Interaction, description: str):
        await interaction.response.defer(thinking=True)

        payload = {
            "user_id": str(interaction.user.id),
            "description": description
        }

        # ---- CALL /ideas/evaluate ----
        async with aiohttp.ClientSession() as session:
            async with session.post(f"{API_BASE}/ideas/evaluate", json=payload) as resp:
                if resp.status != 200:
                    t = await resp.text()
                    return await interaction.followup.send(f"API error: {resp.status} {t}")
                data = await resp.json()

        eval_report = data["evaluation"]

        embed = discord.Embed(
            title="💡 Idea Evaluation",
            description=description[:2000],
            color=0x4CAF50
        )
        embed.add_field(name="Feasibility", value=eval_report.get("feasibility", "N/A"), inline=False)
        embed.add_field(name="Market demand", value=eval_report.get("market_demand", "N/A"), inline=False)
        embed.add_field(name="Score", value=str(eval_report.get("overall_score", 0)), inline=True)

        refinements = eval_report.get("refinements", [])
        embed.add_field(name="Refinements", value="\n".join(f"- {r}" for r in refinements), inline=False)


        # ---------------------------------------------------------
        # Button to create survey
        # ---------------------------------------------------------
        class CreateSurveyButton(discord.ui.Button):
            def __init__(self):
                super().__init__(label="Create Survey", style=discord.ButtonStyle.primary)

            async def callback(self, i: discord.Interaction):
                await i.response.defer(ephemeral=True, thinking=True)

                survey_payload = {
                    "idea_id": data["idea_id"],
                    "channel_id": str(interaction.channel.id),
                    "title": description[:200]
                }

                # ---- CALL /surveys ----
                async with aiohttp.ClientSession() as session:
                    async with session.post(f"{API_BASE}/surveys", json=survey_payload) as r2:
                        if r2.status != 200:
                            t = await r2.text()
                            return await i.followup.send("API Error creating survey: " + t, ephemeral=True)
                        survey_data = await r2.json()

                survey_id = survey_data["id"]

                # ---------------------------------------------------------
                # Buttons for voting
                # ---------------------------------------------------------
                class VoteButton(discord.ui.Button):
                    def __init__(self, label, value):
                        super().__init__(style=discord.ButtonStyle.secondary, label=label)
                        self.value = value

                    async def callback(self, vote_interaction: discord.Interaction):
                        vote_payload = {
                            "survey_id": survey_id,
                            "user_id": str(vote_interaction.user.id),
                            "response": self.value
                        }

                        # ---- CALL /surveys/response ----
                        async with aiohttp.ClientSession() as session2:
                            async with session2.post(f"{API_BASE}/surveys/response", json=vote_payload) as r3:
                                if r3.status != 200:
                                    return await vote_interaction.response.send_message(
                                        "Failed to record vote.", ephemeral=True
                                    )

                        await vote_interaction.response.send_message("Thanks for voting!", ephemeral=True)

                vote_view = discord.ui.View()
                vote_view.add_item(VoteButton("👍 Yes", "yes"))
                vote_view.add_item(VoteButton("🤔 Maybe", "maybe"))
                vote_view.add_item(VoteButton("👎 No", "no"))

                # Post survey
                msg = await interaction.channel.send(
                    content=f"📊 **Survey:** {description[:300]}", view=vote_view
                )

                try:
                    await msg.pin()
                except Exception:
                    logger.warning("Could not pin message.")

                await i.followup.send("Survey created and pinned!", ephemeral=True)


        view = discord.ui.View()
        view.add_item(CreateSurveyButton())

        await interaction.followup.send(embed=embed, view=view)


# Add command group
bot.tree.add_command(Evaluate(name="evaluate"))


# ---------------------------------------------------------
# Run bot
# ---------------------------------------------------------
if __name__ == "__main__":
    bot.run(DISCORD_TOKEN)
