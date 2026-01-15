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
    export let mainpage = false

    let newBoardDialog
    let newMirrorDialog
    let showArchived: boolean = false

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

    let aboutDialog
//    <GroupParticipants/>

</script>

<AboutDialog bind:this={aboutDialog} />
<div class="board-menu" >
    <!-- Unified Items Section - Sorted by Last Edit -->
    <div class="items-section">
        <!-- Combined Boards and Mirrors sorted by timestamp -->

        <!-- Add New Buttons -->
        {#if true}
            <div class="item-card new-item-card" on:click={()=>newBoardDialog.open()} on:keydown={(e) => e.key === 'Enter' && newBoardDialog.open()} role="button" tabindex="0" title="New Board">
                <div class="new-item-content">
                    <SvgIcon color="#888" size="40px" icon=faSquarePlus />
                    <div class="new-item-label">New Table</div>
                </div>
            </div>
            
            <div class="item-card new-item-card" on:click={()=>newMirrorDialog.open()} on:keydown={(e) => e.key === 'Enter' && newMirrorDialog.open()} role="button" tabindex="0" title="New View">
                <div class="new-item-content">
                    <SvgIcon color="#888" size="40px" icon=faSquarePlus />
                    <div class="new-item-label">New View</div>
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
</style>