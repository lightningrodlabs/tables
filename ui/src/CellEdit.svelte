<script lang="ts">
    import '@shoelace-style/shoelace/dist/components/button/button.js';
    import '@shoelace-style/shoelace/dist/components/input/input.js';
    import type SlInput from '@shoelace-style/shoelace/dist/components/input/input.js';
    import { getContext, onMount } from "svelte";
    import { hrlWithContextToB64, onVisible } from './util';
    import { ColumnType, type Cell, Board, ColumnDef } from './board';
    import { createEventDispatcher } from "svelte";
    import AttachmentsList from './AttachmentsList.svelte';
    import type { EntryHash } from "@holochain/client";
    import { encodeHashToBase64, decodeHashFromBase64 } from "@holochain/client";
    import type { TablesStore } from './store';
    import Avatar from './Avatar.svelte';
    import SelectRowAndValue from './SelectRowAndValue.svelte';

    import "@holochain-open-dev/profiles/dist/elements/search-agent.js";
    import "@holochain-open-dev/profiles/dist/elements/profiles-context.js";

    import SvgIcon from './SvgIcon.svelte';

    const dispatch = createEventDispatcher()
    const { getStore } :any = getContext("store");
    let store: TablesStore = getStore();

    export let unique;
    export let type;
    export let columnDef:ColumnDef;
    export let cell:Cell;
    export let width;
    export let allColumnCells = [];

    let allColumnValues = []
    let searchAgentOpen = false;
    let origValue = ""
    let closing = ""
    let boardHash: EntryHash

    $: allColumnValues = allColumnCells.map((cell:Cell)=>cell?.value)
    $: cellValuePresent = cell?.value !== undefined
    $: boardHash = columnDef.linkedTable ? decodeHashFromBase64(columnDef.linkedTable) : null
    $: boardData = columnDef.linkedTable ? store.boardList.boardData2.get(boardHash) : null

    // assign boardhash as columndef.linkedtable and change type to EntryHash

    onMount(async () => {
        let closing = ""
        value = cell? cell.value : ""
        origValue = value
        if (inputElement) {
            onVisible(inputElement,()=>{
                console.log("FISH")
                    inputElement.focus()
                    inputElement.select()
            })
        }
	});
    let inputElement:SlInput

    const slTypes = {}
    slTypes[ColumnType.String] = "text"
    slTypes[ColumnType.Number] = "number"
    slTypes[ColumnType.Email] = "email"
    slTypes[ColumnType.Date] = "date"
    slTypes[ColumnType.URL] = "text"

    let value
</script>

{#if slTypes[type] !== undefined}
    {@const allColumnValuesExceptThisCell = cellValuePresent ? allColumnValues.filter((v)=>v!=cell.value) : allColumnValues}
    <sl-input
    class:duplicate = {allColumnValuesExceptThisCell.includes(value) && unique}
    size="small"
    bind:this={inputElement}
    on:blur={()=>{
        if (closing!="cancel") {
            const value = inputElement.value
            if (value != origValue) {
                dispatch("save", value)
            }
        }
    }}
    type={slTypes[type]} 
    style="width:{width}px" 
    value={value} 
    on:sl-input={(e)=>{
        value = e.target.value
    }}
    on:keydown={(e)=> {
        if (e.keyCode == 27) {
            closing="cancel"
            dispatch("cancel")
        }
        if (e.keyCode == 13 && (!allColumnValuesExceptThisCell.includes(value) || !unique)) {
            closing="save"
            inputElement.blur()
        }
    }}
/>
{:else if type==ColumnType.User}
    <div style="display:flex"
                        >
        {#if value}
            <Avatar agentPubKey={value} size={32} namePosition="row" nameColor="rgba(86, 94, 109, 1.0)" showAvatar={true} showNickname={true} placeholder={false}/>
        {/if}
        <button title="Search For User" class="attachment-button" style="margin-right:10px" on:click={
            ()=>{
                searchAgentOpen = !searchAgentOpen
            }
        } >          
            <SvgIcon icon="faUser" size="16px"/>
        </button>
        {#if searchAgentOpen}
        <!-- <profiles-context store={store.profilesStore}> -->
        <search-agent
            on:agent-selected={(e)=>{
                console.log("Agent selected", e.detail)
                dispatch("save", encodeHashToBase64(e.detail.agentPubKey))
                searchAgentOpen = false
            }}
        ></search-agent>
        <!-- </profiles-context> -->
        {/if}
    </div>
{:else if type==ColumnType.WeaveAsset}
    <div style="display:flex"
                      >
        {#if value}
            <AttachmentsList attachments={[value]} allowDelete={true}
            on:remove-attachment={()=>{
                dispatch("save", null)
            }}
        />
        {/if}
        <button title="Search For Attachment" class="attachment-button" style="margin-right:10px" on:click={async ()=>{
        const hrl = await store.weClient.userSelectHrl()
        if (hrl) {
            value = hrlWithContextToB64(hrl)
            dispatch("save", value)
        }
        }} >          
            <SvgIcon icon="link" size="20px"/>
        </button>
    </div>
{:else if type==ColumnType.TableLink}
    <div style="display:flex">
        <SelectRowAndValue
            boardHash={decodeHashFromBase64(columnDef.linkedTable)}
            keyColumn={columnDef.keyColumn}
            displayColumn={columnDef.displayColumn}
            on:select={(e)=>{
                console.log(e.detail)
                dispatch("save", e.detail)
            }}
        />
    </div>
{:else }
    Unimplemented Type!!
    {type}
{/if}


<style>
    .duplicate {
        border: 2px solid red;
    }
</style>