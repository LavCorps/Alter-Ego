﻿const settings = include('Configs/settings.json');
const constants = include('Configs/constants.json');
var game = include('game.json');

const Status = include(`${constants.dataDir}/Status.js`);

class Die {
    constructor(stat, attacker, defender) {
        this.min = settings.diceMin;
        this.max = settings.diceMax;

        let baseRoll;
        if (attacker && attacker.hasAttribute("all or nothing")) {
            // Make the base roll either the minimum or maximum possible.
            baseRoll = this.doBaseRoll(0, 1);
            baseRoll = baseRoll * (this.max - 1);
            baseRoll += this.min;
        }
        else baseRoll = this.doBaseRoll();
        this.baseRoll = baseRoll;

        let modifiers = this.calculateModifiers(stat, attacker, defender);
        this.modifier = modifiers.number;
        this.modifierString = modifiers.strings.join(", ");
        this.result = this.baseRoll + this.modifier;
    }

    doBaseRoll(min, max) {
        if (min === null || min === undefined) min = this.min;
        if (max === null || max === undefined) max = this.max;
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    calculateModifiers(stat, attacker, defender) {
        var modifier = 0;
        var modifierStrings = [];
        if (attacker) {
            if (attacker.hasAttribute("coin flipper")) {
                let hasCoin = false;
                for (let i = 0; i < attacker.inventory.length; i++) {
                    if ((attacker.inventory[i].name === "LEFT HAND" || attacker.inventory[i].name === "RIGHT HAND") &&
                        attacker.inventory[i].equippedItem !== null && attacker.inventory[i].equippedItem.name.includes("COIN")) {
                        hasCoin = true;
                        break;
                    }
                }
                if (hasCoin) {
                    const coinModifier = this.doBaseRoll(0, 1);
                    if (coinModifier === 1) {
                        modifier += coinModifier;
                        modifierStrings.push("+1 (coin flip)");
                    }
                }
            }

            var tempStatuses = [];
            if (defender) {
                if (stat === "str") {
                    const dexterityModifier = -1 * defender.getStatModifier(defender.dexterity);
                    modifier += dexterityModifier;
                    if (dexterityModifier > 0)
                        modifierStrings.push(`+${dexterityModifier} (-1 * stat modifier of ${defender.name}'s dexterity stat: ${defender.dexterity})`);
                    else if (dexterityModifier < 0)
                        modifierStrings.push(`${dexterityModifier} (-1 * stat modifier of ${defender.name}'s dexterity stat: ${defender.dexterity})`);
                }
                // Apply any of the defender's status effect modifiers that affect the attacker.
                for (let i = 0; i < defender.status.length; i++) {
                    for (let j = 0; j < defender.status[i].statModifiers.length; j++) {
                        const statModifier = defender.status[i].statModifiers[j];
                        // Get defender's modifiers that affect the attacker's roll.
                        if (!statModifier.modifiesSelf) {
                            const tempStatus = new Status(`${defender.name} ${defender.status[i].name}`, "", false, false, [], [], null, null, null, [{ modifiesSelf: true, stat: statModifier.stat, assignValue: statModifier.assignValue, value: statModifier.value }], "", "", "", -1);
                            tempStatuses.push(tempStatus);
                            attacker.inflict(game, tempStatus, false, false, false);
                        }
                    }
                }
            }

            // Apply attacker's stat modifier.
            if (stat) {
                let statValue = 0;
                if (stat === "str") statValue = attacker.strength;
                else if (stat === "int") statValue = attacker.intelligence;
                else if (stat === "dex") statValue = attacker.dexterity;
                else if (stat === "spd") statValue = attacker.speed;
                else if (stat === "sta") statValue = attacker.stamina;

                const statModifier = attacker.getStatModifier(statValue);
                modifier += statModifier;
                if (statModifier > 0)
                    modifierStrings.push(`+${statModifier} (stat modifier of ${attacker.name}'s ${stat} stat: ${statValue})`);
                else if (statModifier < 0)
                    modifierStrings.push(`${statModifier} (stat modifier of ${attacker.name}'s ${stat} stat: ${statValue})`);
            }

            // Cure attacker of all tempStatuses.
            for (let i = 0; i < tempStatuses.length; i++)
                attacker.cure(game, tempStatuses[i].name, false, false, false);
        }

        return { number: modifier, strings: modifierStrings };
    }
}

module.exports = Die;
