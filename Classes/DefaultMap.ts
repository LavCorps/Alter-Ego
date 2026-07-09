// SPDX-FileCopyrightText: 2026 LavCorps <lavcorps@protonmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

/**
 * A Python DefaultDict-like object, designed to fill in a Map with defaults as needed.
 */
export default class DefaultMap<K extends any, V extends any> extends Map<K, V> {
    private readonly factory: () => V;

    /**
     * @param factory - The factory with which to create defaults with.
     * @param entries - The entries to pre-populate the Map with. Passed to the Map constructor.
     */
    constructor(factory: () => V, entries?: Iterable<[K, V] | null>) {
        super(entries);
        this.factory = factory;
    }

    /**
     * Returns a specified element from the DefaultMap object.
     * @param key - The key to look up in the DefaultMap object. If it doesn't exist, it will be created using the given factory function.
     * @returns Returns the element associated with the specified key. If no element is associated with the specified key, undefined is returned.
     */
    override get(key: K): V {
        if (!this.has(key)) {
            this.set(key, this.factory());
        }
        return super.get(key);
    }
}