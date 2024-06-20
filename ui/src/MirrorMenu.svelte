<script lang="ts">
    import { getContext } from "svelte";
    import type { TablesStore } from "./store";
    import type {  EntryHash } from '@holochain/client';
    import GroupParticipants from './GroupParticipants.svelte';
    import NewMirrorDialog from './NewMirrorDialog.svelte';
    import SvgIcon from "./SvgIcon.svelte";
    import AboutDialog from "./AboutDialog.svelte";
    import LogoIcon from "./icons/LogoIcon.svelte";
    import MirrorMenuItem from "./MirrorMenuItem.svelte";
    import { MirrorType } from "./mirrorList";
    export let mainpage = false

    let newMirrorDialog

    const { getStore } :any = getContext('store');

    const store:TablesStore = getStore();

    $: activeMirrors = store.mirrorList.activeMirrorHashes
    $: archivedMirrors = store.mirrorList.archivedMirrorHashes

    $: uiProps = store.uiProps

    const bgUrl = "none"

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
<div class="mirror-menu" >

    <h1 class="type-header">Views</h1>

    <div class="mirrors-section">
        {#if $activeMirrors.status == "complete" && $activeMirrors.value.length > 0}
            {#each $activeMirrors.value as hash}
                <div
                    on:click={()=>selectMirror(hash)}
                    class="mirror" >
                    <MirrorMenuItem largeDisplay={true} mirrorType={MirrorType.active} mirrorHash={hash}></MirrorMenuItem>
                    <!-- <div class="mirror-bg" style="background-image: url({bgUrl});"></div> -->
                </div>
            {/each}
        {/if}

        {#if !mainpage}
            <div class="new-mirror" on:click={()=>newMirrorDialog.open()} title="New Table"><SvgIcon color="white" size=25px icon=faSquarePlus style="margin-left: 15px;"/></div>
        {/if}
    </div>
    
    {#if $archivedMirrors.status == "complete" && $archivedMirrors.value.length > 0}
        <h3 class="type-header">Archived Views</h3>
        <div class="mirrors-section">
            {#each $archivedMirrors.value as hash}
                <div
                    on:click={()=>unarchiveMirror(hash)}
                    class="mirror" style="height: 45px; border-radius: 4px">
                    <MirrorMenuItem mirrorType={MirrorType.archived} mirrorHash={hash}></MirrorMenuItem>
                    <!-- <div class="mirror-bg" style="background-image: url({bgUrl});"></div> -->
                </div>
            {/each}
        </div>
    {/if}

    <NewMirrorDialog bind:this={newMirrorDialog}></NewMirrorDialog>
</div>

<style>
    .mirrors-section {
        display: flex;
        flex-wrap: wrap;
        padding-left: 10px;
    }

    .mirror-menu {
        /* overflow-y: auto; */
        display: flex;
        flex-direction: column;
        flex: 0 0 auto;
        align-items: flex-start;
        position: relative;
    }


    .mirror-menu::-webkit-scrollbar {
        width: 10px;
        background-color: transparent;
    }

    .mirror-menu::-webkit-scrollbar-thumb {
        height: 5px;
        border-radius: 0;
        background: rgba(20,60,119,.9);
        opacity: 1;
    }

    .type-header {
        font-size: 12px;
        font-weight: normal;
        color: #000000;
        opacity: .6;
        margin-top: 40px;
        /* margin-bottom: 10px; */
        margin-left: 10px;
        font-size: 18px;
    }


    .new-mirror {
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

    .new-mirror:hover {
        cursor: pointer;
        padding: 15px 5px;
        width: 60px;
        /* border: 1px solid #252d5d; */
        /* background: rgb(10, 25, 57); */
        margin: 0 -5px 0 -5px;
        /* box-shadow: 0px 4px 15px rgba(35, 32, 74, 0.8); */
    }

    .mirror {
        color: black;
        width: 260px;
        height: 90px;
        border-radius: 5px;
        padding: 5px;
        /* border-radius: 2px 2px 30px 30px; */
        padding: 8px;
        margin-top: 20px;
        margin-right: 20px;
        /* margin: 5px; */
        transition: all .25s ease;
        border: 1px solid rgba(68, 68, 68, 0.5);
        /* background: linear-gradient(180deg, rgba(255, 255, 255, 1) 0%, rgb(200 221 237) 100%); */
        /* background: linear-gradient(180deg, rgb(101 62 14) 0%, rgb(193 120 34) 100%); */
        background: linear-gradient(180deg, #dbdbdb 0%, #696a6ae0 100%);
        position: relative;
        display: block;
        box-shadow: 0px 4px 8px rgba(74, 74, 74, 0.8);
    }

    .mirror:hover {
        cursor: pointer;
        z-index: 100;
        padding: 9px;
        width: 280px;
        /* background: linear-gradient(180deg, rgba(255, 255, 255, 1) 0%, rgba(255, 255, 255, 1) 100%); */
        background: linear-gradient(180deg, #c2c2c2 0%, #494949e0 100%);
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

    .mirror-bg {
        position: absolute;
        z-index: 0;
        height: 100%;
        width: 100%;
        background-size: cover;
    }
</style>