require('dotenv').config();

const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { Client, GatewayIntentBits, Collection } = require('discord.js');

const fs = require('fs');
const path = require('path');

const client = new Client({
    intents: [
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildPresences
    ]
});

// List of all commands
const commands = [];
client.commands = new Collection();

// Fetch all command files from the 'commands' directory
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

// Register each command
for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);

    client.commands.set(command.data.name, command);
    commands.push(command.data.toJSON());
}

// Add the player to the client
const { Player } = require('discord-player');

client.player = new Player(client, {
    ytdlOptions: {
        quality: 'highestaudio',
        highWaterMark: 1 << 25
    }
});
client.player.extractors.loadDefault();
// When the bot is ready, register commands globally for all guilds
client.once('ready', async () => {
    const rest = new REST({ version: '9' }).setToken(process.env.TOKEN);

    for (const guildId of client.guilds.cache.keys()) {
        try {
            await rest.put(
                Routes.applicationGuildCommands(process.env.CLIENT_ID, guildId),
                { body: commands }
            );
            console.log(`Successfully updated commands for guild ${guildId}`);
        } catch (error) {
            console.error(`Failed to update commands for guild ${guildId}:`, error);
        }
    }
});

// Handle command interactions
client.on('interactionCreate', async interaction => {
    console.log('Received interaction:', interaction);
    if (!interaction.isCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        await command.execute({ client, interaction });
    } catch (error) {
        console.error(error);
        await interaction.reply({ content: 'There was an error executing this command' });
    }
});


// Log in to Discord
client.login(process.env.TOKEN);
