import discord
from discord.ext import commands

class Survey(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @commands.command(name="survey")
    async def survey(self, ctx, *, question: str):
        """Create an interest survey for an idea."""

        await ctx.send(
            embed=discord.Embed(
                title="📊 Market Interest Survey",
                description=question,
                color=0x00AEEF
            )
        )

        # Discord built-in poll (2024+)
        message = await ctx.send(
            poll=discord.Poll(
                question=question,
                answers=[
                    discord.PollAnswer(text="🔥 I'd use this"),
                    discord.PollAnswer(text="👍 Interesting"),
                    discord.PollAnswer(text="🤷 Not sure"),
                    discord.PollAnswer(text="❌ No interest")
                ]
            )
        )

        await ctx.send(
            f"🔔 **@everyone** vote in the poll above to help the founder gauge market interest!"
        )

async def setup(bot):
    await bot.add_cog(Survey(bot))
