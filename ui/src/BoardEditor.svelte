<script lang="ts">
    import { LabelDef, type BoardProps, ColumnDef, Board, ColumnType } from './board';
    import { getContext, onMount } from 'svelte';
  	import DragDropList, { VerticalDropZone, reorder, type DropEvent } from 'svelte-dnd-list';
    import 'emoji-picker-element';
    import '@shoelace-style/shoelace/dist/components/dialog/dialog.js';
    import '@shoelace-style/shoelace/dist/components/button/button.js';
    import '@shoelace-style/shoelace/dist/components/input/input.js';
    import '@shoelace-style/shoelace/dist/components/checkbox/checkbox.js';
    import '@shoelace-style/shoelace/dist/components/option/option.js';
    import '@shoelace-style/shoelace/dist/components/select/select.js';
    import SvgIcon from "./SvgIcon.svelte"
    import { cloneDeep } from "lodash";
    import type { TablesStore } from './store';
    import { encodeHashToBase64, type EntryHash } from '@holochain/client';

    const { getStore } :any = getContext('store');

    const store:TablesStore = getStore();
    $: uiProps = store.uiProps

    export let handleSave
    export let handleDelete = undefined
    export let cancelEdit

    let boardHash:EntryHash|undefined = undefined
    let text = ''
    let props:BoardProps = {bgUrl: "", attachments: []}
    let labelDefs: Array<LabelDef> = []
    let columnDefs: Array<ColumnDef> = []
    let nameInput
    let columnType

    export const reset = () => {
      text = ''
      props = {bgUrl: "", attachments: []}
      labelDefs = []
      columnDefs = []
      nameInput.value = ""
      nameInput.focus()
    }

    export const initialFocus = () => {
      nameInput.focus()
    }

    export const  edit = async (hash: EntryHash)=> {
      boardHash = hash
      const board: Board | undefined = await store.boardList.getBoard(boardHash)
      if (board) {
          const state = board.state()
          text = state.name
          nameInput.value = text
          labelDefs = cloneDeep(state.labelDefs)
          console.log("columnDefs", state.columnDefs)
          columnDefs = cloneDeep(state.columnDefs)
          props = state.props ? cloneDeep(state.props) : {bgUrl:""}
      } else {
          console.log("board not found:", boardHash)
      }

    }

    const addLabelDef = () => {
      labelDefs.push(new LabelDef(`🙂`, `description: edit-me`))
      labelDefs = labelDefs
    }
    const deleteLabelDef = (index) => () => {
      labelDefs.splice(index, 1)
      labelDefs = labelDefs
    }
    const addColumnDef = () => {
      columnDefs.push(new ColumnDef(``,ColumnType.String))
      columnDefs = columnDefs
    }
    const deleteColumnDef = (index) => () => {
      columnDefs.splice(index, 1)
      columnDefs = columnDefs
    }
    onMount( async () => {
    })

    const onDropLabelDefs = ({ detail: { from, to } }: CustomEvent<DropEvent>) => {
      if (!to || from === to || from.dropZoneID !== "labelDefs") {
        return;
      }

      labelDefs = reorder(labelDefs, from.index, to.index);
    }
    const onDropColumnDefs = ({ detail: { from, to } }: CustomEvent<DropEvent>) => {
      if (!to || from === to || from.dropZoneID !== "columnDefs") {
        return;
      }

      columnDefs = reorder(columnDefs, from.index, to.index);
    }
   let showEmojiPicker :number|undefined = undefined
   let emojiDialog,colorDialog
   let showColorPicker :number|undefined = undefined
   let hex
   $: valuesValid = text != ""
   let showArchived
   let saving = false
</script>

  <div class='board-editor'>
    <div class="edit-title setting">
      <div class="title-text">Title</div> <sl-input class='textarea' maxlength="60" bind:this={nameInput}  on:input={e=>text= e.target.value}></sl-input>
    </div>
    {#if boardHash && false}

   
    <div class="edit-column-defs unselectable setting">
      <div class="title-text">Columns</div>

      <DragDropList
        id="columnDefs"
        type={VerticalDropZone}
	      itemSize={90}
        itemCount={columnDefs.length}
        on:drop={onDropColumnDefs}
        let:index
        itemClass="unselectable"
        >
        <div class="column-def">
          <div class="grip" ><SvgIcon icon=faGripVertical size=12px/></div>
          <div style="display:flex;flex-direction:column;width:300px">
            <sl-input placeholder="Name" class='textarea' value={columnDefs[index].name} title="column name"
            on:input={e=>columnDefs[index].name = e.target.value}></sl-input>
            <sl-select
              placeholder="Type"
              hoist={true}
              bind:this={columnType}
              on:sl-change={(e)=>{
                columnDefs[index].type= columnType.value
              }}
              value={columnDefs[index].type}
              >
              <sl-option value={ColumnType.String}>Text</sl-option>
              <sl-option value={ColumnType.Number}>Number</sl-option>
              <sl-option value={ColumnType.Date}>Date</sl-option>
              <sl-option value={ColumnType.Email}>Email</sl-option>
              <sl-option value={ColumnType.URL}>URL</sl-option>
              <sl-option value={ColumnType.User}>User</sl-option>
              <sl-option value={ColumnType.TableLink}>Table Link</sl-option>
              <sl-option value={ColumnType.WeaveAsset}>Weave Asset</sl-option>
            </sl-select>
          </div>
          <sl-button size="small" on:click={deleteColumnDef(index)} >
            <SvgIcon icon=faTrash size=12px/>
          </sl-button>

        </div>
      </DragDropList> 
      <div class="add-item" on:click={() => addColumnDef()}>
        <SvgIcon icon=faPlus size=12px/>
        <span>Add Column</span>
      </div>
    </div>
    <div class="edit-label-defs unselectable setting">
      <div class="title-text">Labels</div>
      <DragDropList
        id="labelDefs"
        type={VerticalDropZone}
	      itemSize={45}
        itemCount={labelDefs.length}
        on:drop={onDropLabelDefs}
        let:index
        itemClass="unselectable"
        >
        <div class="label-def">
          <div class="grip" ><SvgIcon icon=faGripVertical size=12px/></div>
          <sl-button on:click={()=>{showEmojiPicker = index;emojiDialog.show()}} >
            <span style="font-size:180%">{labelDefs[index].emoji}</span>
          </sl-button>
          <sl-input class='textarea' value={labelDefs[index].toolTip} title="label name"
          on:input={e=>labelDefs[index].toolTip = e.target.value}> </sl-input>
          <sl-button size="small"  on:click={deleteLabelDef(index)} >
            <SvgIcon icon=faTrash size=12px/>
          </sl-button>
        </div>
      </DragDropList>
      <div class="add-item" on:click={() => addLabelDef()}>
        <SvgIcon icon=faPlus size=12px/>
        <span>Add Label</span>
      </div>
      <sl-dialog label="Choose Emoji" bind:this={emojiDialog}>
        <emoji-picker on:emoji-click={(e)=>  {
          labelDefs[showEmojiPicker].emoji = e.detail.unicode
          console.log(e.detail)
          showEmojiPicker = undefined
          emojiDialog.hide()
        }
        }></emoji-picker>
      </sl-dialog>
    </div>
    <div class="edit-title setting">
      <div class="title-text">Background Image</div>
      <sl-input class='textarea' maxlength="255" value={props.bgUrl} on:input={e=>props.bgUrl = e.target.value} placeholder="Paste the URL of an image"/>
    </div>
    <div>
      <sl-checkbox bind:this={showArchived} checked={$uiProps.showArchived[encodeHashToBase64(boardHash)]}>Show Archived Cards</sl-checkbox>
    </div>
    {/if}
    <div class='controls'>
      {#if handleDelete}
        <sl-button class="board-control" on:click={handleDelete}>
          Archive
        </sl-button>
      {/if}
      <sl-button on:click={cancelEdit} class="board-control">
        Cancel
      </sl-button>

      <sl-button class="board-control"
        variant="primary"
        disabled={!valuesValid || saving} 
        style="margin-left:10px; width:70px;" on:click={async () => {
          saving = true
          await handleSave(text, labelDefs, columnDefs, props, showArchived? showArchived.checked:false)
          saving = false
          }} >
          
        <span >
          {#if saving}
            <div class="spinning"><SvgIcon icon=faSpinner></SvgIcon></div>
          {:else}
            Save
          {/if}
        </span>
        
      </sl-button>
    </div>
 </div>


   
 <style>
  .board-editor {
    display: flex;
    flex-basis: 270px;
    font-style: normal;
    font-weight: 600;
    flex-direction: column;
    justify-content: flex-start;
  }
  .textarea {
    width: 100%;
    padding: 5px;
    margin-right: 5px;
    font-weight: normal;
  }

  .setting {
    background-color: white;
    margin-bottom: 15px;
    box-shadow: 0px 2px 3px rgba(35, 32, 74, 0.15);
    font-size: 12px;
    line-height: 16px;
    color: #23204A;
    border-radius: 5px;
    display:flex;
    flex-direction:column;
    padding: 10px;
    transition: all .25s ease;
    height: 0;
    height: auto;
  }

  .controls {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: flex-end;
    padding-left: 7px;
    padding-top: 10px;
  }
  .label-def, .column-def {
    display: flex;
    flex-direction: row;
    align-items: center;
  }

  .board-control {
    margin-right: 10px;
  }

  .grip {
    margin-right:10px;
    cursor: pointer;
  }
  .title-text {
    display: flex;
    flex-direction: row;
    align-items: center;
    font-weight: normal;
    font-weight: bold;
    font-size: 18px;
    margin-bottom: 10px;
    color: rgba(86, 94, 109, 1.0);
  }
  .unselectable {
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    -khtml-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
  }
  .add-item {
    background-color: white;
    margin: 0px 10px 10px 10px;
    box-shadow: 0px 4px 8px rgba(35, 32, 74, 0.25);
    border-top: 1px solid #e0e0e0;
    font-size: 16px;
    line-height: 16px;
    color: rgba(86, 94, 109, 1.0);
    border-radius: 5px;
    display:flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;
    padding: 10px;
    transition: all .25s ease;
    height: 0;
    height: auto;
    margin-top: 10px;
  }

  .add-item span {
    display: block;
    margin-left: 5px;
    color: rgba(86, 94, 109, 1.0);
  }
.modal {
  background-color: var(--light-text-color);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 1rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
</style>
