<script lang="ts">
  import { type HrlB64WithContext, isWeContext, type HrlWithContext } from "@lightningrodlabs/we-applet";
  import type { Board } from "./board";
  import { getContext } from "svelte";
  import type { TablesStore } from "./store";
  import { hrlWithContextToB64} from "./util";
  import '@shoelace-style/shoelace/dist/components/button/button.js';
  import '@shoelace-style/shoelace/dist/components/dialog/dialog.js';
  import AttachmentsList from "./AttachmentsList.svelte";
  import SvgIcon from "./SvgIcon.svelte";
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher()

  const { getStore } :any = getContext("store");
  let store: TablesStore = getStore();
  let attachments: Array<HrlB64WithContext> = []
  let context: any = undefined
  $:attachments = attachments

  export let activeBoard: Board
  export const close=()=>{dialog.hide()}
  export const open= async (a: Array<HrlB64WithContext>, c:any )=>{
    attachments = a
    context = c
    dialog.show()
  }
  let dialog
  $: attachments

  function removeAttachment(index: number) {
    attachments.splice(index, 1);
    attachments = attachments
    handleSave()
  }

  const addAttachment = async () => {
    const hrl = await store.weClient.userSelectHrl()
    if (hrl) {
      _addAttachment(hrl)
    }
  }

  const _addAttachment = (hrl: HrlWithContext) => {
    attachments.push(hrlWithContextToB64(hrl))
    attachments = attachments
    handleSave()
  }

  const handleSave = async () => {
    dispatch("save", {attachments,context})
  }
</script>

<sl-dialog label={context === "board" ? "Board Links": context === "row" ? "Row Links" : "Value Link"} bind:this={dialog}>
  {#if isWeContext()}
    <AttachmentsList attachments={attachments}
      on:remove-attachment={(e)=>removeAttachment(e.detail)}/>


  <sl-button style="margin-top:5px;margin-right: 5px" circle on:click={()=>addAttachment()} >
    <SvgIcon icon=searchPlus size=30 />
  </sl-button>


  {/if}
</sl-dialog>

<style>


  sl-dialog::part(panel) {
      background: #FFFFFF;
      border: 2px solid rgb(166 115 55 / 26%);
      border-bottom: 2px solid rgb(84 54 19 / 50%);
      border-top: 2px solid rgb(166 115 55 / 5%);
      box-shadow: 0px 15px 40px rgb(130 107 58 / 35%);
      border-radius: 10px;
  }
</style>