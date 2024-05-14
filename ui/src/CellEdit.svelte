<script lang="ts">
    import '@shoelace-style/shoelace/dist/components/button/button.js';
    import '@shoelace-style/shoelace/dist/components/input/input.js';
    import type SlInput from '@shoelace-style/shoelace/dist/components/input/input.js';
    import { getContext, onMount } from "svelte";
    import { onVisible } from './util';
    import { isWeContext, type WAL, weaveUrlFromWal } from "@lightningrodlabs/we-applet";
    import { ColumnType, type Cell, Board, ColumnDef, type CellId } from './board';
    import { createEventDispatcher } from "svelte";
    import AttachmentsList from './AttachmentsList.svelte';
    import type { EntryHash } from "@holochain/client";
    import { encodeHashToBase64, decodeHashFromBase64 } from "@holochain/client";
    import type { TablesStore } from './store';
    import Avatar from './Avatar.svelte';
    import { stringToColor } from './util';
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
    export let cellId: CellId;
    export let width;
    export let allColumnCells = [];
    export let boardHash: EntryHash

    let allColumnValues = []
    let searchAgentOpen = false;
    let origValue = ""
    let closing = ""
    let label = "";
    $: filteredSuggestions = [
        ...new Set(allColumnValues.filter(value => value !== undefined && value.includes(label))),
        ...(label !== "" ? [label] : [])
    ];
    $: label;

    function checkKey(e: any) {
        if (e.key === "Escape" && !e.shiftKey) {
        e.preventDefault();
            dispatch("cancel")
        }
    }

    onMount(() => {
        window.addEventListener("keydown", checkKey);
    });

    $: allColumnValues = allColumnCells.map((cell:Cell)=>cell?.value)
    $: cellValuePresent = cell?.value !== undefined
    // $: boardHash = columnDef.linkedTable ? decodeHashFromBase64(columnDef.linkedTable) : null
    $: boardData = columnDef.linkedTable ? store.boardList.boardData2.get(boardHash) : null

    // assign boardhash as columndef.linkedtable and change type to EntryHash
    const copyWalToPocket = () => {
        console.log("copyWalToPocket", boardHash)
        const attachment: WAL = { hrl: [store.dnaHash, boardHash], context: {cellId: cellId, def: columnDef, assetType: "Cell"} }
        console.log("attachment", attachment)
        store.weClient?.walToPocket(attachment)
        dispatch("cancel")
    }

    onMount(async () => {
        let closing = ""
        value = cell? cell.value : ""
        origValue = value
        if (inputElement) {
            onVisible(inputElement,()=>{
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

{#if store.weClient}
    <span class="copyWal" title="Add this card to pocket" on:click={()=>copyWalToPocket()}>
      <SvgIcon icon=addToPocket size="20px"/>
    </span>
{/if}

{#if slTypes[type] !== undefined}
    {@const allColumnValuesExceptThisCell = cellValuePresent ? allColumnValues.filter((v)=>v!=cell.value) : allColumnValues}
    <!-- <sl-input
    class="edit-cell-input"
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
/> -->

<input 
    class="edit-cell-input"
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
    on:input={(e)=>{
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
        <search-agent
            on:agent-selected={(e)=>{
                console.log("Agent selected", e.detail)
                dispatch("save", encodeHashToBase64(e.detail.agentPubKey))
                searchAgentOpen = false
            }}
        ></search-agent>
        {/if}
    </div>
{:else if type==ColumnType.WeaveAsset || type==ColumnType.WALEmbed}
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
        const hrl = await store.weClient.userSelectWal()
        if (hrl) {
            value = weaveUrlFromWal(hrl)
            dispatch("save", value)
        }
        }} >          
            <SvgIcon icon="link" size="20px"/>
        </button>
    </div>
{:else if type==ColumnType.Label}
    <div style="display:flex; flex-direction: column">
        <!-- type any string but auto-suggest all previous values from other cells in this column -->
        <input
        bind:this={inputElement}
        class="edit-cell-input"
        type="text" placeholder="Type to search..." bind:value={label} on:input={() => {}} />
        {#if filteredSuggestions.length > 0}
            <ul class="label-suggestions">
                {#each filteredSuggestions as item}
                    <li
                        style="background-color: {stringToColor(item)};"
                        class="label-suggestion"
                        on:click={() => {
                            value = item
                            dispatch("save", item)
                        }}>
                        {item}
                    </li>
                {/each}
            </ul>
        {/if}
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

    .copyWal {
        position: absolute; z-index: 1; margin-left: 170px;
        cursor: pointer;
        border-radius: 100%;
        padding: 0px;
        width: 22px;
        height: 22px;
        margin-top: 0px;
        padding: 1px;
    }

    .copyWal:hover {
        background-color: #e6a85d;
    }

    .edit-cell-input {
        background-color: rgb(251, 216, 174);
        border: 0;
        outline: 1px solid #e6a85d;
        margin: 2px;
        display: inline-block;
        width: 100%;
    }

    /* :global(.edit-cell-input) {
        --sl-input-background-color: #e6a85d !important;
        --sl-input-focus-ring-color: transparent;
    } */
    ul.label-suggestions {
        list-style: none;
        padding: 0;
        margin-top: 5px;
        background: white;
        border: 1px solid #ccc;
        width: 196px;
        position:absolute; 
        margin-top: 29px;
        border: 4px solid rgb(173, 173, 173);
    }

    li.label-suggestion {
        background-color: white;
        border: 1px solid #ccc;
        cursor: pointer;
        padding: 4px 8px;
        color: black;
        font-size: 13px; 
        font-weight: bold; 
        margin: 0; 
        padding: 0 4px;
    }
</style>