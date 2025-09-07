const time_player = include('Commands/time_player');

var bot_mock = include('Test/Mocks/bot').mock;
var game_mock = include('Test/Mocks/game').mock;
var message_mock = include('Test/Mocks/message').mock;
var player_mock = include('Test/Mocks/player').mock;

describe('time_player command', () => {
    beforeEach(() => {
        bot = bot_mock;
        game = game_mock;
        message = message_mock;
        player = player_mock;
    });
    
    afterEach(() => {
        jest.clearAllMocks();
    });
    
    test('should show time when player is ok', async () => {
        player.getAttributeStatusEffects.mockReturnValue([]);
        await time_player.run(bot, game, message, 'time', [], player);
        expect(game.messageHandler.addGameMechanicMessage).toHaveBeenCalled();
        expect(game.messageHandler.addReply).not.toHaveBeenCalled();
        const timeMessage = game.messageHandler.addGameMechanicMessage.mock.calls[0][1];
        expect(timeMessage).toMatch(/The time is \*\*\d?\d:\d\d:\d\d A?P?M\*\*\./); // TODO: match to LocaleTimeString
    });
    
    test('should not show time when player has disable time status', async () => {
        const statusEffect = { name: 'timeless' };
        player.getAttributeStatusEffects.mockReturnValue([statusEffect]);
        await time_player.run(bot, game, message, 'time', [], player);
        expect(game.messageHandler.addReply).toHaveBeenCalled();
        expect(game.messageHandler.addGameMechanicMessage).not.toHaveBeenCalled();
        const timeMessage = game.messageHandler.addReply.mock.calls[0][1];
        expect(timeMessage).toBe(`You cannot do that because you are **${statusEffect.name}**.`);
    });
});