const DiscordApi = require('discord.js');

const discord = new DiscordApi.Client({ intents: [ DiscordApi.Intents.FLAGS.GUILD_MEMBERS ]});
const settings = require("../settings.json");
const token = settings.discord.token;

// login to discord - we should auto reconnect automatically
discord.login(token).catch(console.error);

async function getMemberRoles(memberId) {
    var primaryGuild = settings.discord.guild;
    var guild = discord.guilds.cache.get(primaryGuild);
    var member = await guild.members.fetch({
        user: memberId,
        force: true
    });
    var roleList = [];

    member.roles.cache.forEach(role => roleList.push(role.name));

    return roleList;
}

module.exports = {
    getMemberRoles: getMemberRoles
};