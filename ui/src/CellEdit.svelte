<script lang="ts">
    import '@shoelace-style/shoelace/dist/components/button/button.js';
    import '@shoelace-style/shoelace/dist/components/input/input.js';
    import type SlInput from '@shoelace-style/shoelace/dist/components/input/input.js';
    import { getContext, onMount } from "svelte";
    import { hrlWithContextToB64, onVisible } from './util';
    import { ColumnType, type Cell, Board } from './board';
    import { createEventDispatcher } from "svelte";
    import AttachmentsList from './AttachmentsList.svelte';
    import type { TablesStore } from './store';
  import SvgIcon from './SvgIcon.svelte';

    const dispatch = createEventDispatcher()
    const { getStore } :any = getContext("store");
    let store: TablesStore = getStore();

    export let type
    export let cell:Cell
    export let width

    let origValue = ""
    let closing = ""

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
    <sl-input
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
        if (e.keyCode == 13) {
            closing="save"
            inputElement.blur()  
        }
    }}
/>
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
{:else }
    Unimplemented Type!!
    {type}
{/if}


<style>
</style>