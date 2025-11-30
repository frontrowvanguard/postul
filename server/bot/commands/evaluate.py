import discord
from discord.ext import commands
import requests
import os

API_URL = os.getenv("POSTUL_API_URL")

class Evaluate(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @commands.command(name="evaluate")
    async def evaluate(self, ctx, *, idea: str):
        """Send an idea to the LLM for feedback."""
        await ctx.send("⏳ Evaluating your idea…")

        response = requests.post(
            f"{API_URL}/evaluate",
            json={"idea": idea}
        )

        if response.status_code != 200:
            return await ctx.send("❌ Server error evaluating idea.")

        feedback = response.json()

        embed = discord.Embed(
            title="💡 Idea Evaluation",
            description=feedback["summary"],
            color=0x4CAF50
        )

        embed.add_field(name="Feasibility", value=feedback["feasibility"], inline=False)
        embed.add_field(name="Market Demand", value=feedback["market_demand"], inline=False)
        embed.add_field(name="Suggestions", value=feedback["suggestions"], inline=False)

        await ctx.send(embed=embed)

async def setup(bot):
    await bot.add_cog(Evaluate(bot))
