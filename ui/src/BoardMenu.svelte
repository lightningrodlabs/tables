<script lang="ts">
    import { getContext } from "svelte";
    import { derived, get } from "svelte/store";
    import type { TablesStore } from "./store";
    import type {  EntryHash } from '@holochain/client';
    import GroupParticipants from './GroupParticipants.svelte';
    import NewBoardDialog from './NewBoardDialog.svelte';
    import NewMirrorDialog from './NewMirrorDialog.svelte';
    import SvgIcon from "./SvgIcon.svelte";
    import AboutDialog from "./AboutDialog.svelte";
    import LogoIcon from "./icons/LogoIcon.svelte";
    import BoardMenuItem from "./BoardMenuItem.svelte";
    import { BoardType } from "./boardList";
    import MirrorMenuItem from "./MirrorMenuItem.svelte";
    import { presets, type PresetInfo } from "./presets";
    import { deserializeExport } from "./export";
    import type { Board } from "./board";
    import type { Mirror } from "./mirror";
    import { weaveUrlFromWal } from '@theweave/api';
    
    export let mainpage = false

    let newBoardDialog
    let newMirrorDialog
    let showArchived: boolean = false
    let showCreateChoice: boolean = false
    let selectedPreset: string = ""
    let importing: boolean = false

    const { getStore } :any = getContext('store');

    const store:TablesStore = getStore();

    $: activeBoards = store.boardList.activeBoardHashes
    $: archivedBoards = store.boardList.archivedBoardHashes
    $: activeMirrors = store.mirrorList.activeMirrorHashes
    $: archivedMirrors = store.mirrorList.archivedMirrorHashes
    $: uiProps = store.uiProps

    // Helper function to extract timestamp from feed
    const getLatestTimestamp = (feed: any): number => {
        if (!feed) return 0;
        const timestamps = Object.keys(feed).map(key => {
            const [, timestamp] = key.split(".");
            return parseInt(timestamp);
        });
        return timestamps.length > 0 ? Math.max(...timestamps) : 0;
    };

    // Create store references with data stores
    $: activeBoardsWithStores = $activeBoards.status === "complete" 
        ? $activeBoards.value.map(hash => ({
            hash,
            type: 'board' as const,
            dataStore: store.boardList.boardData2.get(hash)
        }))
        : [];

    $: activeMirrorsWithStores = $activeMirrors.status === "complete"
        ? $activeMirrors.value.map(hash => ({
            hash,
            type: 'mirror' as const,
            dataStore: store.mirrorList.mirrorData2.get(hash)
        }))
        : [];

    // Combine all items with their stores
    $: allItemsWithStores = [...activeBoardsWithStores, ...activeMirrorsWithStores];

    // Create a derived store that watches all data stores and sorts by timestamp
    $: combinedItemsStore = derived(
        allItemsWithStores.map(item => item.dataStore),
        (dataValues) => {
            const items = allItemsWithStores.map((item, index) => {
                const data = dataValues[index];
                let timestamp = 0;
                
                if (data && data.status === "complete") {
                    const feed = data.value?.latestState?.feed;
                    timestamp = getLatestTimestamp(feed);
                }
                
                return {
                    hash: item.hash,
                    type: item.type,
                    timestamp
                };
            });
            
            // Sort by timestamp descending (most recent first)
            return items.sort((a, b) => b.timestamp - a.timestamp);
        }
    );

    // Subscribe to the derived store
    $: combinedItems = $combinedItemsStore;

    // Do the same for archived items
    $: archivedBoardsWithStores = $archivedBoards.status === "complete"
        ? $archivedBoards.value.map(hash => ({
            hash,
            type: 'board' as const,
            dataStore: store.boardList.boardData2.get(hash)
        }))
        : [];

    $: archivedMirrorsWithStores = $archivedMirrors.status === "complete"
        ? $archivedMirrors.value.map(hash => ({
            hash,
            type: 'mirror' as const,
            dataStore: store.mirrorList.mirrorData2.get(hash)
        }))
        : [];

    $: allArchivedWithStores = [...archivedBoardsWithStores, ...archivedMirrorsWithStores];

    $: combinedArchivedStore = derived(
        allArchivedWithStores.map(item => item.dataStore),
        (dataValues) => {
            const items = allArchivedWithStores.map((item, index) => {
                const data = dataValues[index];
                let timestamp = 0;
                
                if (data && data.status === "complete") {
                    const feed = data.value?.latestState?.feed;
                    timestamp = getLatestTimestamp(feed);
                }
                
                return {
                    hash: item.hash,
                    type: item.type,
                    timestamp
                };
            });
            
            return items.sort((a, b) => b.timestamp - a.timestamp);
        }
    );

    $: combinedArchived = $combinedArchivedStore;

    const bgUrl = "none"

    const selectBoard = async (hash: EntryHash) => {
        store.setActiveBoard(hash)
        store.boardList.setActiveRow(undefined)
    }

    const unarchiveBoard = async (hash: EntryHash) => {
        store.boardList.unarchiveBoard(hash)
        selectBoard(hash)
    }

    const selectMirror = async (hash: EntryHash) => {
        store.setActiveMirror(hash)
        store.mirrorList.setActiveRow(undefined)
    }

    const unarchiveMirror = async (hash: EntryHash) => {
        store.mirrorList.unarchiveMirror(hash)
        selectMirror(hash)
    }

    const importPreset = async () => {
        if (!selectedPreset) return;
        
        const preset = presets.find(p => p.id === selectedPreset);
        if (!preset) return;

        importing = true;
        try {
            const jsonString = JSON.stringify(preset.data);
            const imported = deserializeExport(jsonString);
            const boards: Array<Board> = [];
            const mirrors: Array<Mirror> = [];
            let board;
            
            // Import boards first
            for (const b of imported.boards) {
                console.log("importing preset board", b.name);
                try {
                    board = await store.boardList.makeBoard(b);
                    boards.push(board);
                } catch(e) {
                    console.log("error importing preset board", b.name, e);
                }
            }
            
            // Import mirrors and link the first board as var_1 if boards exist
            for (const m of imported.mirrors) {
                console.log("importing preset view", m.name);
                try {
                    // If we have at least one board, add it as var_1 to the mirror
                    if (boards.length > 0) {
                        const boardHash = boards[0].hash;
                        const wal = { 
                            hrl: [store.dnaHash, boardHash] as [Uint8Array, Uint8Array], 
                            context: { assetType: 'Table' } 
                        };
                        const walUrl = weaveUrlFromWal(wal);
                        
                        // Add var_1 variable with the board reference
                        if (!m.variables) {
                            m.variables = [];
                        }
                        m.variables.push({
                            name: "var_1",
                            value: walUrl
                        });
                    }
                    
                    const newMirror = await store.mirrorList.makeMirror(m)
                    mirrors.push(newMirror);
                } catch(e) {
                    console.log("error importing preset view", m.name, e);
                }
            }
            
            // If only one item imported, activate it
            const totalImported = boards.length + mirrors.length;
            if (totalImported == 1) {
                store.setUIprops({showMenu:false});
                if (boards.length == 1) {
                    await boards[0].join();
                    await store.setActiveBoard(boards[0].hash);
                } else if (mirrors.length == 1) {
                    await store.setActiveMirror(mirrors[0].hash);
                }
            } else if (mirrors.length > 0) {
                // If multiple items, activate the first mirror (view)
                store.setUIprops({showMenu:false});
                await store.setActiveMirror(mirrors[0].hash);
            }
        } catch(e) {
            console.error("Error importing preset:", e);
        } finally {
            importing = false;
            showCreateChoice = false;
            selectedPreset = "";
        }
    }

    let aboutDialog
//    <GroupParticipants/>

</script>

<AboutDialog bind:this={aboutDialog} />
<div class="board-menu" >
    <!-- Unified Items Section - Sorted by Last Edit -->
    <div class="items-section">
        <!-- Combined Boards and Mirrors sorted by timestamp -->

        <!-- Add New Button -->
        {#if true}
            <div class="item-card new-item-card" on:click={()=>showCreateChoice = true} on:keydown={(e) => e.key === 'Enter' && (showCreateChoice = true)} role="button" tabindex="0" title="Create New">
                <div class="new-item-content">
                    <SvgIcon color="#888" size="40px" icon=faSquarePlus />
                    <div class="new-item-label">New</div>
                </div>
            </div>
        {/if}
        {#each combinedItems as item}
            {#if item.type === 'board'}
                <div
                    on:click={()=>selectBoard(item.hash)}
                    on:keydown={(e) => e.key === 'Enter' && selectBoard(item.hash)}
                    role="button"
                    tabindex="0"
                    class="item-card board-card" >
                    <BoardMenuItem largeDisplay={true} boardType={BoardType.active} boardHash={item.hash}></BoardMenuItem>
                </div>
            {:else if item.type === 'mirror'}
                <div
                    on:click={()=>selectMirror(item.hash)}
                    on:keydown={(e) => e.key === 'Enter' && selectMirror(item.hash)}
                    role="button"
                    tabindex="0"
                    class="item-card mirror-card" >
                    <div class="card-type-indicator mirror-indicator">
                        <span class="type-icon">
                            <SvgIcon color="#444" size="16px" icon="faEye" />
                        </span>
                    </div>
                    <MirrorMenuItem largeDisplay={true} mirrorHash={item.hash}></MirrorMenuItem>
                </div>
            {/if}
        {/each}
    </div>

    <NewBoardDialog bind:this={newBoardDialog}></NewBoardDialog>
    <NewMirrorDialog bind:this={newMirrorDialog}></NewMirrorDialog>
    
    {#if showCreateChoice}
        <div class="modal-overlay" on:click={() => showCreateChoice = false}>
            <div class="modal-content" on:click|stopPropagation>
                <h3>Create New</h3>
                <div class="choice-buttons">
                    <button class="choice-btn" on:click={() => { showCreateChoice = false; newBoardDialog.open(); }}>
                        <SvgIcon color="#444" size="32px" icon="faBars" />
                        <span>Table</span>
                    </button>
                    <button class="choice-btn" on:click={() => { showCreateChoice = false; newMirrorDialog.open(true); }}>
                        <SvgIcon color="#444" size="32px" icon="faEye" />
                        <span>View</span>
                    </button>
                </div>
                
                {#if presets.length > 0}
                    <div class="preset-section">
                        <div class="divider">OR</div>
                        <h4>Start from Template</h4>
                        <select bind:value={selectedPreset} class="preset-select">
                            <option value="">Choose a template...</option>
                            {#each presets as preset}
                                <option value={preset.id}>{preset.name}</option>
                            {/each}
                        </select>
                        {#if selectedPreset}
                            <p class="preset-description">
                                {presets.find(p => p.id === selectedPreset)?.description}
                            </p>
                            <button 
                                class="preset-import-btn" 
                                on:click={importPreset}
                                disabled={importing}
                            >
                                {importing ? 'Importing...' : 'Create from Template'}
                            </button>
                        {/if}
                    </div>
                {/if}
            </div>
        </div>
    {/if}
</div>

<!-- Revealable archived items -->
<div class="board-menu" >
    {#if combinedArchived.length > 0}
        <div
            style="display: flex; align-items: center; margin-left: 10px; margin-top: 10px;"
        >
            <input type="checkbox" bind:checked={showArchived} id="toggle-archived" style="margin-left: 10px;"/>
            <label for="toggle-archived" style="cursor: pointer; margin-left: 5px; font-size: 13px; color: #666;">
                Show Archive?
            </label>
        </div>
        {#if showArchived}
            <div class="items-section" style="margin-top: 10px;">
                {#each combinedArchived as item}
                    {#if item.type === 'board'}
                        <div
                            on:click={()=>unarchiveBoard(item.hash)}
                            on:keydown={(e) => e.key === 'Enter' && unarchiveBoard(item.hash)}
                            role="button"
                            tabindex="0"
                            class="item-card board-card" >
                            <BoardMenuItem largeDisplay={true} boardType={BoardType.archived} boardHash={item.hash}></BoardMenuItem>
                        </div>
                    {:else if item.type === 'mirror'}
                        <div
                            on:click={()=>unarchiveMirror(item.hash)}
                            on:keydown={(e) => e.key === 'Enter' && unarchiveMirror(item.hash)}
                            role="button"
                            tabindex="0"
                            class="item-card mirror-card" >
                            <div class="card-type-indicator mirror-indicator">
                                <span class="type-icon">
                                    <SvgIcon color="#444" size="16px" icon="faEye" />
                                </span>
                            </div>
                            <MirrorMenuItem largeDisplay={true} mirrorHash={item.hash}></MirrorMenuItem>
                        </div>
                    {/if}
                {/each}
            </div>
        {/if}
    {/if}
</div>

<style>
    .board-menu {
        display: flex;
        flex-direction: column;
        flex: 0 0 auto;
        align-items: flex-start;
        position: relative;
        width: 100%;
    }

    .board-menu::-webkit-scrollbar {
        width: 10px;
        background-color: transparent;
    }

    .board-menu::-webkit-scrollbar-thumb {
        height: 5px;
        border-radius: 0;
        background: rgba(20,60,119,.9);
        opacity: 1;
    }

    /* Unified Items Section */
    .items-section {
        display: flex;
        flex-wrap: wrap;
        gap: 20px;
        padding: 20px 10px;
        width: 100%;
    }

    /* Unified Card Styling */
    .item-card {
        position: relative;
        width: 240px;
        height: 90px;
        border-radius: 8px;
        padding: 12px;
        transition: all .25s ease;
        cursor: pointer;
        box-shadow: 0px 3px 8px rgba(0, 0, 0, 0.15);
        display: flex;
        flex-direction: column;
        overflow: hidden;
    }

    /* Board Card Specific */
    .board-card {
        background: linear-gradient(135deg, #434343 0%, #2a2a2a 100%);
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: white;
    }

    .board-card:hover {
        transform: translateY(-4px) scale(1.02);
        box-shadow: 0px 6px 20px rgba(0, 0, 0, 0.3);
        background: linear-gradient(135deg, #5a5a5a 0%, #3a3a3a 100%);
        width: 250px;
        height: 100px;
        margin: -5px;
    }

    /* Mirror Card Specific */
    .mirror-card {
        background: linear-gradient(135deg, #e8e8e8 0%, #b8b8b8 100%);
        border: 1px solid rgba(0, 0, 0, 0.1);
        color: #1a1a1a;
    }

    .mirror-card:hover {
        transform: translateY(-4px) scale(1.02);
        box-shadow: 0px 6px 20px rgba(0, 0, 0, 0.25);
        background: linear-gradient(135deg, #f5f5f5 0%, #c8c8c8 100%);
        width: 250px;
        height: 100px;
        margin: -5px;
    }

    /* Type Indicator Badge */
    .card-type-indicator {
        position: absolute;
        top: 8px;
        right: 8px;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        opacity: 0.7;
        transition: opacity .2s ease;
    }

    .item-card:hover .card-type-indicator {
        opacity: 1;
    }

    .board-indicator {
        background: rgba(255, 255, 255, 0.15);
        backdrop-filter: blur(10px);
    }

    .mirror-indicator {
        background: rgba(0, 0, 0, 0.08);
        backdrop-filter: blur(10px);
    }

    /* New Item Card */
    .new-item-card {
        background: linear-gradient(135deg, #f8f8f8 0%, #e0e0e0 100%);
        border: 2px dashed #aaa;
        color: #666;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all .2s ease;
    }

    .new-item-card:hover {
        border-color: #888;
        background: linear-gradient(135deg, #ffffff 0%, #f0f0f0 100%);
        transform: translateY(-2px);
        box-shadow: 0px 4px 12px rgba(0, 0, 0, 0.15);
        width: 250px;
        height: 100px;
        margin: -5px;
    }

    .new-item-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
    }

    .new-item-label {
        font-size: 13px;
        font-weight: 600;
        color: #666;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    .new-item-card:hover .new-item-label {
        color: #333
    }

    .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
    }

    .modal-content {
        background: white;
        padding: 32px;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
        min-width: 300px;
    }

    .modal-content h3 {
        margin: 0 0 24px 0;
        text-align: center;
        color: #333;
        font-size: 20px;
    }

    .choice-buttons {
        display: flex;
        gap: 16px;
        justify-content: center;
    }

    .choice-btn {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
        padding: 24px;
        background: white;
        border: 2px solid #ddd;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s ease;
        min-width: 120px;
    }

    .choice-btn:hover {
        border-color: #4caf50;
        background: #f8f8f8;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .choice-btn span {
        font-size: 14px;
        font-weight: 600;
        color: #555;
    }

    .choice-btn:hover span {
        color: #333;
    }

    .preset-section {
        margin-top: 24px;
        padding-top: 24px;
    }

    .divider {
        text-align: center;
        color: #999;
        font-size: 12px;
        font-weight: 600;
        margin-bottom: 16px;
        position: relative;
    }

    .divider::before,
    .divider::after {
        content: '';
        position: absolute;
        top: 50%;
        width: 40%;
        height: 1px;
        background: #ddd;
    }

    .divider::before {
        left: 0;
    }

    .divider::after {
        right: 0;
    }

    .preset-section h4 {
        margin: 0 0 12px 0;
        color: #333;
        font-size: 14px;
        text-align: center;
    }

    .preset-select {
        width: 100%;
        padding: 10px;
        border: 2px solid #ddd;
        border-radius: 6px;
        font-size: 14px;
        margin-bottom: 12px;
        cursor: pointer;
        transition: border-color 0.2s ease;
    }

    .preset-select:hover {
        border-color: #4caf50;
    }

    .preset-select:focus {
        outline: none;
        border-color: #4caf50;
    }

    .preset-description {
        font-size: 13px;
        color: #666;
        margin: 8px 0;
        line-height: 1.4;
        text-align: center;
        white-space: pre-wrap;
    }

    .preset-import-btn {
        width: 100%;
        padding: 12px;
        background: #4caf50;
        color: white;
        border: none;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        margin-top: 8px;
    }

    .preset-import-btn:hover:not(:disabled) {
        background: #45a049;
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
    }

    .preset-import-btn:disabled {
        background: #ccc;
        cursor: not-allowed;
    }
</style>