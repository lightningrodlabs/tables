<script lang="ts">
    import { getContext } from "svelte";
    import type { TablesStore } from "./store";
    import type {  EntryHash } from '@holochain/client';
    import GroupParticipants from './GroupParticipants.svelte';
    import NewBoardDialog from './NewBoardDialog.svelte';
    import SvgIcon from "./SvgIcon.svelte";
    import AboutDialog from "./AboutDialog.svelte";
    import LogoIcon from "./icons/LogoIcon.svelte";
    import BoardMenuItem from "./BoardMenuItem.svelte";
    import { BoardType } from "./boardList";
    export let mainpage = false

    let newBoardDialog

    const { getStore } :any = getContext('store');

    const store:TablesStore = getStore();

    $: activeBoards = store.boardList.activeBoardHashes
    $: archivedBoards = store.boardList.archivedBoardHashes

    $: uiProps = store.uiProps

    const bgUrl = "none"

    const selectBoard = async (hash: EntryHash) => {
        store.setActiveBoard(hash)
        store.boardList.setActiveRow(undefined)
    }

    const unarchiveBoard = async (hash: EntryHash) => {
        store.boardList.unarchiveBoard(hash)
        selectBoard(hash)
    }

    let aboutDialog
//    <GroupParticipants/>

</script>

<AboutDialog bind:this={aboutDialog} />
<div class="board-menu" >

    <div class="boards-section">
        {#if $activeBoards.status == "complete" && $activeBoards.value.length > 0}
            {#each $activeBoards.value as hash}
                <div
                    on:click={()=>selectBoard(hash)}
                    class="board" >
                    <BoardMenuItem largeDisplay={true} boardType={BoardType.active} boardHash={hash}></BoardMenuItem>
                    <!-- <div class="board-bg" style="background-image: url({bgUrl});"></div> -->
                </div>
            {/each}
        {/if}

        {#if !mainpage}
            <div class="new-board" on:click={()=>newBoardDialog.open()} title="New Tub"><SvgIcon color="white" size=25px icon=faSquarePlus style="margin-left: 15px;"/></div>
        {/if}
    </div>
    
    {#if $archivedBoards.status == "complete" && $archivedBoards.value.length > 0}
        <h3 class="type-header">Archived Boards</h3>
        <div class="boards-section">
            {#each $archivedBoards.value as hash}
                <div
                    on:click={()=>unarchiveBoard(hash)}
                    class="board" style="height: 45px; border-radius: 4px">
                    <BoardMenuItem boardType={BoardType.archived} boardHash={hash}></BoardMenuItem>
                    <!-- <div class="board-bg" style="background-image: url({bgUrl});"></div> -->
                </div>
            {/each}
        </div>
    {/if}

    <!-- {#if !mainpage} -->
        <NewBoardDialog bind:this={newBoardDialog}></NewBoardDialog>
        <div class="footer" 
            on:click={()=>aboutDialog.open()}>   
            <div class="logo" title="About Tables"><LogoIcon /></div>
            <div class="cog"><SvgIcon icon=faCog size="20px" color="#fff"/></div>
        </div>
    <!-- {/if} -->
</div>

<style>
    .boards-section {
        display: flex;
        flex-wrap: wrap;
        padding-left: 10px;
    }

    .board-menu {
        /* overflow-y: auto; */
        display: flex;
        flex-direction: column;
        flex: 0 0 auto;
        align-items: flex-start;
        position: relative;
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

    .type-header {
        font-size: 12px;
        font-weight: normal;
        color: #fff;
        opacity: .6;
        margin-top: 40px;
        /* margin-bottom: 10px; */
        margin-left: 10px;
        font-size: 18px;
    }


    .new-board {
        box-sizing: border-box;
        position: relative;
        width: 50px;
        height: 30px;
        /* background: rgba(24, 55, 122, 1.0); */
        /* border: 1px solid #4A559D; */
        color: #fff;
        display: flex;
        align-items: center;
        border-radius: 5px;
        font-size: 46px;
        font-weight: bold;
        transition: all .25s ease;
        top: 3px;
        padding: 15px 0;
        box-shadow: 0px 4px 8px rgba(35, 32, 74, 0);
    }

    .new-board:hover {
        cursor: pointer;
        padding: 15px 5px;
        width: 60px;
        /* border: 1px solid #252d5d; */
        /* background: rgb(10, 25, 57); */
        margin: 0 -5px 0 -5px;
        /* box-shadow: 0px 4px 15px rgba(35, 32, 74, 0.8); */
    }

    .board {
        width: 260px;
        height: 90px;
        /* border-radius: 5px;
        padding: 5px; */
        border-radius: 2px 2px 30px 30px;
        padding: 8px;
        margin-top: 20px;
        margin-right: 20px;
        /* margin: 5px; */
        transition: all .25s ease;
        border: 1px solid rgb(84 54 19 / 50%);
        /* background: linear-gradient(180deg, rgba(255, 255, 255, 1) 0%, rgb(200 221 237) 100%); */
        /* background: linear-gradient(180deg, rgb(101 62 14) 0%, rgb(193 120 34) 100%); */
        background: linear-gradient(180deg,  rgb(101 62 14 / 84%) 0%, rgb(193 120 34 / 88%) 100%);
        position: relative;
        display: block;
        box-shadow: 0px 4px 8px rgb(74 58 32 / 80%);
    }

    .board:hover {
        cursor: pointer;
        z-index: 100;
        padding: 9px;
        width: 280px;
        /* background: linear-gradient(180deg, rgba(255, 255, 255, 1) 0%, rgba(255, 255, 255, 1) 100%); */
        background: linear-gradient(180deg, rgb(147, 92, 25) 0%, rgb(209, 131, 40) 100%);
        margin: 0 -1px 0 -10px;
        margin-right: 10px;
        margin-bottom: -14px;
        margin-top: 14px;
        height: 110px;
        box-shadow: 0px 4px 14px rgba(35, 32, 74, 0.8);
        z-index: 100;
    }

    .footer {
        padding: 10px;
        border-radius: 0;
        bottom: 0px;
        height: 40px;
        display: block;
        align-items: center;
        left: 0;
        /* background-color: rgba(23, 55, 123, .9); */
        animation-duration: .3s;
        animation-name: slideIn;
        animation-iteration-count: 1;
        animation-timing-function: cubic-bezier(0.42, 0, 0.58, 1.1);
        z-index: 1000;
        --margin-end-position: 0px;
        --margin-start-position: -330px;
        margin-left: 0;
    }

    @keyframes slideIn {
        from {
            margin-left: var(--margin-start-position);
            backdrop-filter: blur(10px);
        }

        to {
            margin-left: var(--margin-end-position);
            backdrop-filter: blur(0px);
        }
    }
    
    .footer div {
        display: inline-block;
    }

    .footer:hover {
        cursor: pointer;
    }

    .logo {
        height: 16px;
        margin-right: 5px;
    }

    .board-bg {
        position: absolute;
        z-index: 0;
        height: 100%;
        width: 100%;
        background-size: cover;
    }
</style>