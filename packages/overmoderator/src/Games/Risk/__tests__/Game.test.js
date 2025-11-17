const Game = require('../Game');
const Player = require('../Player');
const Territory = require('../Territory');
const boardData = require('../board.json');

// Mock the boardData to simplify testing, or ensure board.json is valid
jest.mock('../board.json', () => ({
    continents: [
        { id: 'test_continent', name: 'Test Continent', bonus_armies: 2 }
    ],
    territories: [
        { id: 't1', name: 'Territory 1', continent: 'test_continent', neighbors: ['t2'] },
        { id: 't2', name: 'Territory 2', continent: 'test_continent', neighbors: ['t1'] },
        { id: 't3', name: 'Territory 3', continent: 'test_continent', neighbors: [] }
    ]
}));

describe('Game', () => {
    let game;

    beforeEach(() => {
        game = new Game();
    });

    test('should initialize with empty players and correct phase', () => {
        expect(game.players).toEqual([]);
        expect(game.phase).toBe('setup');
        expect(game.territories.size).toBe(3); // Based on mocked boardData
        expect(game.continents.size).toBe(1); // Based on mocked boardData
    });

    test('addPlayer should add a player and assign initial troops', () => {
        game.addPlayer('player1');
        expect(game.players.length).toBe(1);
        expect(game.players[0].id).toBe('player1');
        // Initial troops depend on number of players, for 1 player it's 0 by default in getInitialTroops
        // The current implementation of getInitialTroops returns 0 for 1 player, which might be a bug or intended.
        // For 2 players, it returns 40. Let's test with 2 players.
        game = new Game(); // Reset game
        game.addPlayer('player1');
        game.addPlayer('player2');
        expect(game.players[0].troopsToDeploy).toBe(40);
        expect(game.players[1].troopsToDeploy).toBe(40);
    });

    test('getInitialTroops should return correct troop counts', () => {
        expect(game.getInitialTroops(2)).toBe(40);
        expect(game.getInitialTroops(3)).toBe(35);
        expect(game.getInitialTroops(4)).toBe(30);
        expect(game.getInitialTroops(5)).toBe(25);
        expect(game.getInitialTroops(6)).toBe(20);
        expect(game.getInitialTroops(1)).toBe(0); // Default case
        expect(game.getInitialTroops(7)).toBe(0); // Default case
    });

    test('setup should assign territories and initial troops', () => {
        game.addPlayer('player1');
        game.addPlayer('player2');
        game.setup();

        expect(game.phase).toBe('deployment');
        expect(game.players[0].territories.length + game.players[1].territories.length).toBe(3); // All territories assigned
        
        // Each territory starts with 1 troop, and 1 troop is deducted from troopsToDeploy
        // So, troopsToDeploy should be initial - assigned territories
        const initialTroops = game.getInitialTroops(2); // 40
        const player1AssignedTerritories = game.players[0].territories.length;
        const player2AssignedTerritories = game.players[1].territories.length;

        expect(game.players[0].troopsToDeploy).toBe(initialTroops - player1AssignedTerritories);
        expect(game.players[1].troopsToDeploy).toBe(initialTroops - player2AssignedTerritories);

        game.territories.forEach(t => {
            expect(t.owner).not.toBeNull();
            expect(t.troops).toBe(1);
        });
    });

    test('getCurrentPlayer should return the player whose turn it is', () => {
        game.addPlayer('player1');
        game.addPlayer('player2');
        expect(game.getCurrentPlayer().id).toBe('player1');
        game.turn = 1;
        expect(game.getCurrentPlayer().id).toBe('player2');
    });

    test('nextPhase should cycle through phases', () => {
        game.phase = 'deployment';
        expect(game.nextPhase()).toBe('attack');
        expect(game.phase).toBe('attack');

        expect(game.nextPhase()).toBe('fortification');
        expect(game.phase).toBe('fortification');

        game.addPlayer('player1'); // Need players for nextTurn to work
        game.addPlayer('player2');
        game.setup(); // Set up territories for nextTurn to calculate troops

        game.phase = 'fortification'; // Manually set to fortification to test nextTurn
        const initialTurn = game.turn;
        const initialPlayerTroopsToDeploy = game.getCurrentPlayer().troopsToDeploy;

        expect(game.nextPhase()).toBe('deployment'); // Calls nextTurn, which sets phase to deployment
        expect(game.phase).toBe('deployment');
        expect(game.turn).toBe((initialTurn + 1) % game.players.length);
        expect(game.getCurrentPlayer().troopsToDeploy).toBeGreaterThanOrEqual(3); // Minimum 3 troops
    });

    test('nextTurn should advance turn and reset phase to deployment', () => {
        game.addPlayer('player1');
        game.addPlayer('player2');
        game.setup(); // Assign territories for troop calculation

        const initialTurn = game.turn;
        game.nextTurn();
        expect(game.turn).toBe((initialTurn + 1) % game.players.length);
        expect(game.phase).toBe('deployment');
        expect(game.getCurrentPlayer().troopsToDeploy).toBeGreaterThanOrEqual(3); // Minimum 3 troops
    });

    test('checkWinCondition should return null if no winner', () => {
        game.addPlayer('player1');
        game.addPlayer('player2');
        game.setup();
        expect(game.checkWinCondition()).toBeNull();
    });

    test('checkWinCondition should return the winning player if only one remains', () => {
        const player1 = game.addPlayer('player1');
        game.addPlayer('player2');
        game.setup();

        // Simulate player2 being eliminated
        game.players = [player1];
        expect(game.checkWinCondition()).toBe(player1);
    });

    test('checkWinCondition should return the winning player if one player owns all territories', () => {
        const player1 = game.addPlayer('player1');
        game.addPlayer('player2');
        game.setup();

        // Simulate player1 owning all territories
        game.territories.forEach(t => t.setOwner(player1));
        player1.territories = Array.from(game.territories.keys());
        game.players[1].territories = []; // Player 2 has no territories

        expect(game.checkWinCondition()).toBe(player1);
    });

    test('rollDice should return an array of sorted dice rolls', () => {
        const rolls = game.rollDice(3);
        expect(rolls.length).toBe(3);
        expect(rolls[0]).toBeGreaterThanOrEqual(rolls[1]);
        expect(rolls[1]).toBeGreaterThanOrEqual(rolls[2]);
        rolls.forEach(roll => {
            expect(roll).toBeGreaterThanOrEqual(1);
            expect(roll).toBeLessThanOrEqual(6);
        });
    });

    // Attack tests
    test('attack should return error for invalid territories', () => {
        const result = game.attack('invalid', 't1', 1);
        expect(result.success).toBe(false);
        expect(result.message).toContain('Invalid territories.');
    });

    test('attack should return error if attacking own territory', () => {
        const player1 = game.addPlayer('player1');
        game.addPlayer('player2');
        game.setup();
        game.phase = 'attack'; // Set phase for attack

        // Find two territories owned by player1
        const p1Territory1 = game.territories.get(player1.territories[0]);
        const p1Territory2 = game.territories.get(player1.territories[1]);

        const result = game.attack(p1Territory1.id, p1Territory2.id, 1);
        expect(result.success).toBe(false);
        expect(result.message).toContain('You cannot attack your own territory.');
    });

    test('attack should return error if territories are not adjacent', () => {
        const player1 = game.addPlayer('player1');
        const player2 = game.addPlayer('player2');
        game.setup();
        game.phase = 'attack';

        // Manually set up ownership for non-adjacent territories
        const t1 = game.territories.get('t1');
        const t3 = game.territories.get('t3');
        t1.setOwner(player1);
        t3.setOwner(player2);
        player1.territories = ['t1'];
        player2.territories = ['t3'];

        const result = game.attack('t1', 't3', 1);
        expect(result.success).toBe(false);
        expect(result.message).toContain('Territories are not adjacent.');
    });

    test('attack should return error if not enough troops to attack', () => {
        const player1 = game.addPlayer('player1');
        const player2 = game.addPlayer('player2');
        game.setup();
        game.phase = 'attack';

        const t1 = game.territories.get('t1');
        const t2 = game.territories.get('t2');

        // Ensure t1 is owned by player1 and t2 by player2
        t1.setOwner(player1);
        t2.setOwner(player2);
        player1.territories = ['t1'];
        player2.territories = ['t2'];

        t1.troops = 1; // Only 1 troop, cannot attack with 1 (must leave 1 behind)
        const result = game.attack('t1', 't2', 1);
        expect(result.success).toBe(false);
        expect(result.message).toContain('You must leave at least one troop behind');
    });

    test('attack should simulate combat and update troop counts', () => {
        const player1 = game.addPlayer('player1');
        const player2 = game.addPlayer('player2');
        game.setup();
        game.phase = 'attack';

        const t1 = game.territories.get('t1'); // Attacker
        const t2 = game.territories.get('t2'); // Defender

        // Ensure t1 is owned by player1 and t2 by player2
        t1.setOwner(player1);
        t2.setOwner(player2);
        player1.territories = ['t1'];
        player2.territories = ['t2'];

        t1.troops = 5;
        t2.troops = 3;

        // Mock rollDice to control outcomes for testing
        const originalRollDice = game.rollDice;
        game.rollDice = jest.fn()
            .mockReturnValueOnce([6, 5]) // Attacker rolls
            .mockReturnValueOnce([1, 2]); // Defender rolls (sorted)

        const result = game.attack('t1', 't2', 2); // Attack with 2 troops
        expect(result.success).toBe(true);
        expect(t1.troops).toBeLessThanOrEqual(5); // Attacker might lose troops
        expect(t2.troops).toBeLessThanOrEqual(3); // Defender might lose troops
        expect(game.rollDice).toHaveBeenCalledTimes(2);

        game.rollDice = originalRollDice; // Restore original
    });

    test('attack should conquer territory if defender loses all troops', () => {
        const player1 = game.addPlayer('player1');
        const player2 = game.addPlayer('player2');
        game.setup();
        game.phase = 'attack';

        const t1 = game.territories.get('t1'); // Attacker
        const t2 = game.territories.get('t2'); // Defender

        // Ensure t1 is owned by player1 and t2 by player2
        t1.setOwner(player1);
        t2.setOwner(player2);
        player1.territories = ['t1'];
        player2.territories = ['t2'];

        t1.troops = 5;
        t2.troops = 1;

        // Mock rollDice to ensure attacker wins
        const originalRollDice = game.rollDice;
        game.rollDice = jest.fn()
            .mockReturnValueOnce([6, 5]) // Attacker rolls
            .mockReturnValueOnce([1]); // Defender rolls (sorted)

        const result = game.attack('t1', 't2', 2);
        expect(result.success).toBe(true);
        expect(t2.owner.id).toBe(player1.id); // Player 1 now owns t2
        expect(player1.territories).toContain('t2');
        expect(player2.territories).not.toContain('t2');
        expect(t2.troops).toBeGreaterThan(0); // Troops moved to conquered territory
        expect(t1.troops).toBeLessThan(5); // Troops moved from attacking territory

        game.rollDice = originalRollDice; // Restore original
    });

    test('attack should eliminate player if they lose all territories', () => {
        const player1 = game.addPlayer('player1');
        const player2 = game.addPlayer('player2');
        game.setup();
        game.phase = 'attack';

        const t1 = game.territories.get('t1'); // Attacker
        const t2 = game.territories.get('t2'); // Defender

        // Ensure t1 is owned by player1 and t2 by player2
        t1.setOwner(player1);
        t2.setOwner(player2);
        player1.territories = ['t1'];
        player2.territories = ['t2']; // Player 2 only owns t2

        t1.troops = 5;
        t2.troops = 1;

        // Mock rollDice to ensure attacker wins
        const originalRollDice = game.rollDice;
        game.rollDice = jest.fn()
            .mockReturnValueOnce([6, 5]) // Attacker rolls
            .mockReturnValueOnce([1]); // Defender rolls (sorted)

        const result = game.attack('t1', 't2', 2);
        expect(result.success).toBe(true);
        expect(game.players).not.toContain(player2); // Player 2 eliminated

        game.rollDice = originalRollDice; // Restore original
    });

    // Fortify tests
    test('fortify should return error for invalid territories', () => {
        const result = game.fortify('invalid', 't1', 1);
        expect(result.success).toBe(false);
        expect(result.message).toContain('Invalid territories.');
    });

    test('fortify should return error if territories not owned by current player', () => {
        const player1 = game.addPlayer('player1');
        const player2 = game.addPlayer('player2');
        game.setup();
        game.phase = 'fortification';

        const t1 = game.territories.get('t1');
        const t2 = game.territories.get('t2');

        t1.setOwner(player1);
        t2.setOwner(player2);
        player1.territories = ['t1'];
        player2.territories = ['t2'];

        const result = game.fortify('t1', 't2', 1);
        expect(result.success).toBe(false);
        expect(result.message).toContain('You can only fortify between your own territories.');
    });

    test('fortify should return error if territories are not adjacent', () => {
        const player1 = game.addPlayer('player1');
        game.addPlayer('player2');
        game.setup();
        game.phase = 'fortification';

        const t1 = game.territories.get('t1');
        const t3 = game.territories.get('t3');

        t1.setOwner(player1);
        t3.setOwner(player1);
        player1.territories = ['t1', 't3'];

        const result = game.fortify('t1', 't3', 1);
        expect(result.success).toBe(false);
        expect(result.message).toContain('Territories are not adjacent.');
    });

    test('fortify should return error if not enough troops to move', () => {
        const player1 = game.addPlayer('player1');
        game.addPlayer('player2');
        game.setup();
        game.phase = 'fortification';

        const t1 = game.territories.get('t1');
        const t2 = game.territories.get('t2');

        t1.setOwner(player1);
        t2.setOwner(player1);
        player1.territories = ['t1', 't2'];

        t1.troops = 1; // Only 1 troop, cannot move 1 (must leave 1 behind)
        const result = game.fortify('t1', 't2', 1);
        expect(result.success).toBe(false);
        expect(result.message).toContain('You must leave at least one troop behind');
    });

    test('fortify should move troops between territories', () => {
        const player1 = game.addPlayer('player1');
        game.addPlayer('player2');
        game.setup();
        game.phase = 'fortification';

        const t1 = game.territories.get('t1');
        const t2 = game.territories.get('t2');

        t1.setOwner(player1);
        t2.setOwner(player1);
        player1.territories = ['t1', 't2'];

        t1.troops = 5;
        t2.troops = 1;

        const result = game.fortify('t1', 't2', 3);
        expect(result.success).toBe(true);
        expect(t1.troops).toBe(2); // 5 - 3
        expect(t2.troops).toBe(4); // 1 + 3
    });
});
