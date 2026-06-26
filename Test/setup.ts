import { beforeAll, afterEach, vi, expect } from 'vitest';
import { plugins } from '@vitest/pretty-format';

import demodata from './__mocks__/configs/demodata.js';
import serverconfig from './__mocks__/configs/serverconfig.js';

import toBeWithinRange from './__extenders__/toBeWithinRange.ts';
import toBeLength from './__extenders__/toBeLength.ts';
import toHaveSize from './__extenders__/toHaveSize.ts';
import toBeInvokedWith from './__extenders__/toBeInvokedWith.ts';
import toBeWebhookMessage from './__extenders__/toBeWebhookMessage.ts';
import toBeMessageWith from './__extenders__/toBeMessageWith.ts';

import * as sheetsMock from './__mocks__/libs/sheets.js';
vi.mock('../Modules/sheets.js', () => sheetsMock);
import * as discordMock from './__mocks__/libs/discord.js';
vi.mock(import('discord.js'), async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        discordMock
    }

});

import GuildContext from '../Classes/GuildContext.ts';
import Game from '../Data/Game.ts';
import ClientContext from '../Classes/ClientContext.ts';
import { CategoryChannel, ChannelType, Client, Guild, GuildMember, Role, TextChannel, type Channel } from 'discord.js';
import {DEFAULT_GAME_SETTINGS} from "../Modules/settingsLoader.ts";

vi.mock('../Configs/demodata.json', () => ({ default: demodata }));
vi.mock('../Configs/serverconfig.json', () => ({ default: serverconfig }));

beforeAll(() => {
    const client = discordMock.createMockClient() as unknown as Client<true>;

    // Create a minimal mocked Discord environment and initialize Game.
    let channels: Channel[] = [];
    const commandChannel = discordMock.createMockChannel(serverconfig.commandChannel, 'bot-commands', ChannelType.GuildText, undefined, undefined, client) as unknown as TextChannel;
    const logChannel = discordMock.createMockChannel(serverconfig.logChannel, 'bot-log', ChannelType.GuildText, undefined, undefined, client) as unknown as TextChannel;
    const announcementChannel = discordMock.createMockChannel(serverconfig.announcementChannel, 'announcements', ChannelType.GuildText, undefined, undefined, client) as unknown as TextChannel;
    const testingChannel = discordMock.createMockChannel(serverconfig.testingChannel, 'testing', ChannelType.GuildText, undefined, undefined, client) as unknown as TextChannel;
    const generalChannel = discordMock.createMockChannel(serverconfig.generalChannel, 'general', ChannelType.GuildText, undefined, undefined, client) as unknown as TextChannel;
    const whisperCategory = discordMock.createMockChannel(serverconfig.whisperCategory, 'Whispers', ChannelType.GuildCategory, undefined, undefined, client) as unknown as TextChannel;
    const spectateCategory = discordMock.createMockChannel(serverconfig.spectateCategory, 'Spectate', ChannelType.GuildCategory, undefined, undefined, client) as unknown as TextChannel;
    channels.push(commandChannel, logChannel, announcementChannel, testingChannel, generalChannel, whisperCategory, spectateCategory);
    const roomCategoryIds = serverconfig.roomCategories.split(',');
    for (const roomCategoryId of roomCategoryIds)
        channels.push(discordMock.createMockChannel(roomCategoryId, 'Rooms', ChannelType.GuildCategory, undefined, undefined, client) as unknown as CategoryChannel);

    let roles: Role[] = [];
    const testerRole = discordMock.createMockRole(serverconfig.testerRole, 'Tester') as unknown as Role;
    const eligibleRole = discordMock.createMockRole(serverconfig.eligibleRole, 'Eligible') as unknown as Role;
    const playerRole = discordMock.createMockRole(serverconfig.playerRole, 'Player') as unknown as Role;
    const freeMovementRole = discordMock.createMockRole(serverconfig.headmasterRole, 'Free Movement') as unknown as Role;
    const moderatorRole = discordMock.createMockRole(serverconfig.moderatorRole, 'Moderator') as unknown as Role;
    const deadRole = discordMock.createMockRole(serverconfig.deadRole, 'Dead') as unknown as Role;
    const spectatorRole = discordMock.createMockRole(serverconfig.spectatorRole, 'Spectator') as unknown as Role;
    roles.push(testerRole, eligibleRole, playerRole, freeMovementRole, moderatorRole, deadRole, spectatorRole);

    const memberIds = ["665168062697177107", "621550382253998081", "778157117936107520", "621554507041734656", "656377156934434818", "849256035867820072", "822180788288094238", "578764435766640640", "430830419793936394"];
    let members: GuildMember[] = [];
    for (const memberId of memberIds) {
        const member = discordMock.createMockMember(memberId);
        member.roles.add(playerRole);
        if (memberId === "430830419793936394") member.roles.add(freeMovementRole);
        members.push(member as unknown as GuildMember);
    }
    const moderator = discordMock.createMockMember("775841429641232417", "Narrator");
    moderator.roles.add(moderatorRole);
    members.push(moderator as unknown as GuildMember);

    const mockGuild = discordMock.createMockGuild(channels, roles, members, client) as unknown as Guild;

    const guildContext = new GuildContext(
        mockGuild,
        commandChannel,
        logChannel,
        announcementChannel,
        testingChannel,
        generalChannel,
        roomCategoryIds,
        serverconfig.whisperCategory,
        serverconfig.spectateCategory,
        testerRole,
        eligibleRole,
        playerRole,
        freeMovementRole,
        moderatorRole,
        deadRole,
        spectatorRole
    );

    // Initialize game.
    const game = new Game(guildContext, DEFAULT_GAME_SETTINGS);
    // Create ClientContext singleton and attach to game.
    ClientContext.Instance(client, game);
    game.setClientContext();
    // Ensure presence update doesn't throw during tests.
    try { ClientContext.instance.updatePresence(); } catch (e) { }
    globalThis.game = game;
    game.messageQueue.manual = true;
});

afterEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
});

expect.extend({
    toBeWithinRange,
    toBeLength,
    toHaveSize,
    toBeInvokedWith,
    toBeWebhookMessage,
    toBeMessageWith
});

import { PolyPlugin } from "../Classes/PrettyPrinter.ts";
const polyPlugin = new PolyPlugin()

plugins.DOMElement.test = polyPlugin.test;
plugins.DOMElement.serialize = polyPlugin.serialize as typeof plugins.DOMElement.serialize;
plugins.DOMCollection.test = () => false;
plugins.DOMCollection.serialize = () => "";
plugins.ReactElement.test = () => false;
plugins.ReactElement.serialize = () => "";
plugins.ReactTestComponent.test = () => false;
plugins.ReactTestComponent.serialize = () => "";
