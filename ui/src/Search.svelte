<script lang="ts">
    import { getContext } from "svelte";
    import { encodeHashToBase64, type EntryHash } from '@holochain/client';
    import SvgIcon from "./SvgIcon.svelte";
    import '@shoelace-style/shoelace/dist/components/select/select.js';
    import '@shoelace-style/shoelace/dist/components/option/option.js';
    import '@shoelace-style/shoelace/dist/components/input/input.js';
    import '@shoelace-style/shoelace/dist/components/icon/icon.js';
    import '@shoelace-style/shoelace/dist/components/menu/menu.js';
    import '@shoelace-style/shoelace/dist/components/menu-item/menu-item.js';
    import '@shoelace-style/shoelace/dist/components/menu-label/menu-label.js';
    import type { v1 as uuidv1 } from "uuid";
    import { toPromise } from "@holochain-open-dev/stores";
    import type { BoardState, BoardStateData } from "./board";
    import type { TablesStore } from "./store";


    type FoundCard = {
        hash: EntryHash,
        state: BoardState,
        card: uuidv1,
        title: string,
    }
    let foundCards: Array<FoundCard> = []
    let foundBoards: Array<BoardStateData> = []
    $: foundCards
    $: foundBoards

    const { getStore } :any = getContext('store');
    const store:TablesStore = getStore();
    $: activeHashB64 = store.boardList.activeBoardHashB64;

    const selectBoard = (hash: EntryHash) => {
        store.setActiveBoard(hash)
    }

    const doSearch = async (text:string) => {
        const fb: BoardStateData[] = []
        const fc: FoundCard[] = []

        showSearchResults = true
        if (text != "") {
            const searchText = text.toLocaleLowerCase()
            const all = await toPromise(store.boardList.allBoards)
            for (const [hash, asyncBoardData] of Array.from(all.entries()) ) {
                const state = asyncBoardData.latestState

                if (state.name.toLocaleLowerCase().includes(searchText) 
                    ) fb.push({hash,state:state})
                // state.cards.forEach((c)=>{
                //     if (c.props.title.toLocaleLowerCase().includes(searchText)
                //     || c.props.description.toLocaleLowerCase().includes(searchText)
                //     || Object.values(c.comments).find(c=>c.text.includes(searchText))

                //     ) {
                //         fc.push({
                //             hash,
                //             state,
                //             card: c.id,
                //             title: c.props.title,
                //         })
                //     }
                // })
            }
        }
        foundBoards = fb
        foundCards = fc

    }
    const clearSearch = () => {
        searchInput.value = ""
        showSearchResults = false
    }

    let searchInput
    let showSearchResults = false

</script>

<div class="search">

<div style="position:relative; margin-left:10px;">
    <sl-input
        bind:this={searchInput}
        placeholder="Search"
        pill
        on:sl-input={(e)=>doSearch(e.target.value)}
        on:sl-focus={(e)=>doSearch(e.target.value)}
    >
    <span slot="prefix"style="margin-left:10px;"><SvgIcon color="#fff" size="16px" icon=faSearch/></span>
    </sl-input>
    {#if showSearchResults && (foundBoards.length>0 || foundCards.length>0)}
    <sl-menu class="search-results"
    >
        {#if foundCards.length>0}
            <sl-menu-label>Cards</sl-menu-label>
            {#each foundCards as found}
                <sl-menu-item
                    on:mousedown={(e)=>{
                        if (encodeHashToBase64(found.hash) != $activeHashB64) {
                            selectBoard(found.hash)
                        }
                        store.boardList.setActiveCard(found.card)
                        clearSearch()
                    }}
                >
                <div style="margin-left:10px;display:flex;flex-direction: column;">
                    <span>{found.title} in {store.getCardGroupName(found.card, found.state)}</span>
                    <span style="font-size:70%;color:gray;line-heigth:50%;">Board: {found.state.name}</span>
                </div>
                </sl-menu-item>
            {/each}
        {/if}
        {#if foundBoards.length>0}
            {#if foundCards.length> 0}<sl-divider></sl-divider>{/if}
            <sl-menu-label>Data Tables</sl-menu-label>
            {#each foundBoards as found}
                <sl-menu-item
                    on:mousedown={(e)=>{
                        if (encodeHashToBase64(found.hash) != $activeHashB64) {
                            selectBoard(found.hash)
                        }
                        clearSearch()
                    }}
                >
                <div style="margin-left:10px;">
                    {found.state.name} 
                </div>
                </sl-menu-item>
            {/each}
        {/if}
    </sl-menu>
    {/if}
</div>

</div>
<style>
.search {
    display: flex;
    flex: 0 0 auto;
    align-items: center;
}
.search-results {
    position: absolute;
    z-index: 10;
    box-shadow: 0px 0px 20px rgba(0, 0, 0, .15);
}
sl-input::part(base) {
    color: #fff;
    /* background-color: rgb(10 17 76); */
    /* border: 1px solid rgba(71, 76, 154, 1.0); */
    /* background-color: rgb(188, 128, 25); */
    background-color: #89b3bf;
    /* border: 1px solid rgb(188, 128, 25); */
    border: 1px solid #055a72;
}

sl-input::part(input) {
    color: #fff;
}

:global(sl-input) {
--sl-input-placeholder-color: #fff;
}
</style>