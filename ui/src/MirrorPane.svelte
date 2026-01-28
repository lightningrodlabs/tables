<script lang="ts">
  import { getContext, onMount } from "svelte";
  import type { TablesStore } from "./store";
  import EditMirrorDialog from "./EditMirrorDialog.svelte";
  import { cloneDeep, isEqual } from "lodash";
  import '@shoelace-style/shoelace/dist/components/dropdown/dropdown.js';
  import '@shoelace-style/shoelace/dist/components/textarea/textarea.js';
  import SvgIcon from "./SvgIcon.svelte";
  import { Marked, Renderer } from "@ts-stack/markdown";
  import hljs from 'highlight.js';
  import AttachmentsList from './AttachmentsList.svelte';
  import type { WAL } from '@theweave/api';
  import { getTableValues, getRowValues, getColumnValues, getValueOfCell, getValueOfColumnSummary } from './DataHelpers';
  import { weaveUrlToWAL, weaveUrlFromWal } from '@theweave/api';
  import jsPDF from 'jspdf';
  import ace from 'ace-builds';
  import 'ace-builds/src-noconflict/mode-html';
  import 'ace-builds/src-noconflict/theme-github';
  import 'ace-builds/src-noconflict/ext-language_tools';

  export let showSettings: boolean = true;
  
  let editMode: boolean = false;
  let showDataPicker: boolean = false;
  let currentVariableIndex: number = -1;
  let dataType: 'table' | 'row' | 'column' | 'cell' = 'table';
  let selectedBoard: any = null;
  let selectedColumn: any = null;
  let selectedRow: any = null;
  let variablesSectionCollapsed: boolean = false;
  let copiedVariableIndex: number = -1;

  class MyRenderer extends Renderer {
    override link(href: string, title : string, text: string) {
      return `<a href="${href}"${title? ` title="${title}"`:""} target="_blank">${text}</a>`
    }
  }

  Marked.setOptions
  ({
    renderer: new MyRenderer,
    highlight: (code, lang) =>  {
      if (lang)
        return hljs.highlight(lang, code).value
      return code
    },
    gfm: true,
    tables: true,
    breaks: false,
    pedantic: false,
    sanitize: true,
    smartLists: true,
    smartypants: false
  });

  $: filterOption = null;

  function setFilterOption(newOption) {
    filterOption = newOption;
  }

  const { getStore } :any = getContext("store");
  let store: TablesStore = getStore();

  export let activeMirror;
  export let standAlone = false

  $: uiProps = store.uiProps
  $: participants = activeMirror.participants()
  // $: activeHashB64 = store.mirrorList.activeMirrorHashB64;
  $: activeHashB64 = activeMirror.hashB64
  $: activeRow = store.mirrorList.activeRow;
  $: allBoards = store.boardList.allBoards
  $: selectedBoardData = selectedBoard ? store.boardList.boardData2.get(selectedBoard) : null

  // Check if mirror should open in edit mode
  $: if ($uiProps.openMirrorInEditMode && !editMode) {
    editMode = true;
    if ($state) {
      name = $state.name || "";
      raw = $state.raw || "";
      variables = cloneDeep($state.variables || []);
    }
    // Clear the flag
    store.setUIprops({openMirrorInEditMode: false});
  }

  // let columnDefs: Array<ColumnDef> = []

  let editMirrorDialog: EditMirrorDialog
  $: state = activeMirror.readableState()
  let queriedData = {};
  $: queriedData;
  let newSummaryRowModal = false;
  $: newSummaryRowModal;
  
  let name = "";
  let raw = "";
  let variables = [];
  
  let aceEditor;
  let editorElement: HTMLDivElement;
  
  $: if (editMode && editorElement && !aceEditor) {
    aceEditor = ace.edit(editorElement, {
      mode: "ace/mode/html",
      theme: "ace/theme/github",
      value: raw,
      fontSize: 14,
      showPrintMargin: false,
      enableBasicAutocompletion: true,
      enableLiveAutocompletion: true,
      tabSize: 2,
    });
    
    aceEditor.session.on('change', () => {
      raw = aceEditor.getValue();
    });
  }
  
  $: if (aceEditor && !editMode) {
    aceEditor.destroy();
    aceEditor = null;
  }
  
  $: if (aceEditor && editMode && aceEditor.getValue() !== raw) {
    const cursorPosition = aceEditor.getCursorPosition();
    aceEditor.setValue(raw, -1);
    aceEditor.moveCursorToPosition(cursorPosition);
  }
  
  let saveTimeout: ReturnType<typeof setTimeout> | null = null;
  
  async function autoSave() {
    if (!editMode) return;
    
    isSaving = true;
    try {
      const mirror = await store.mirrorList.getMirror(activeMirror.hash);
      if (mirror) {
        const mirrorState = mirror.state();
        if (!mirrorState) {
          console.warn("Mirror state is not available yet");
          return;
        }
        
        let changes = [];
        if (mirrorState.name != name) {
          changes.push({type: 'set-name', name: name});
        }
        if (!isEqual(variables, mirrorState.variables)) {
          changes.push({type: 'set-variables', variables: variables.map(v => {
            const {name, value} = v;
            return {name, value};
          })});
        }
        if (raw != mirrorState.raw) {
          changes.push({type: 'set-raw', raw: raw});
        }
        if (changes.length > 0) {
          await mirror.requestChanges(changes);
          await setCellValues();
        }
      }
    } finally {
      isSaving = false;
    }
  }
  
  function debouncedAutoSave() {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      autoSave();
    }, 1000);
  }
  
  // Track if we're in the middle of auto-saving to prevent overwriting local changes
  let isSaving = false;
  
  // Auto-save when edit values change
  $: if (editMode && (name || raw || variables) && !isSaving) {
    debouncedAutoSave();
  }
  
  // Initialize/update edit variables when state changes (including collaborative edits)
  // Only update if we're not currently saving (to avoid overwriting local changes)
  $: if ($state && !isSaving) {
    name = $state.name || "";
    raw = $state.raw || "";
    variables = cloneDeep($state.variables || []);
  }
  
  // Update cell values when state variables change (for collaborative editing)
  // This watches for changes from other collaborators and updates the displayed data
  $: if ($state && $state.variables && JSON.stringify($state.variables)) {
    // The JSON.stringify ensures we detect deep changes in the variables array
    // Use void to explicitly ignore the promise return
    void (async () => {
      try {
        await setCellValues();
        console.log("Updated cell values from collaborative change");
      } catch (error) {
        console.error("Error updating cell values from state change:", error);
      }
    })();
  }
  
  function init(el){
    //if (el)
     // el.focus()
  }

  let cellValues = {}
  $: cellValues;
  let attachmentsDialog;

  const walToPocket = () => {
    const attachment: WAL = { hrl: [store.dnaHash, activeMirror.hash], context: {assetType: "Mirror"} }
    store.weClient?.assets.assetToPocket(attachment)
  }

  async function setCellValues() {
    if ($state.variables) {
      for (const variable of $state.variables) {
        try {
          let wal: WAL = weaveUrlToWAL(variable.value);
          if (!wal) {
            console.warn(`Could not parse WAL from variable ${variable.name}:`, variable.value);
            continue;
          }
          
          switch (wal?.context?.assetType) {
            case "Cell":
              console.log(wal.hrl[1], wal.context?.cellId?.rowId, wal.context?.cellId?.columnId)
              const valueOfCell = await getValueOfCell(wal.hrl[1], wal.context?.cellId?.rowId, wal.context?.cellId?.columnId, store)
              cellValues[variable.name] = valueOfCell
              break
            case "Column Summary":
              const valueOfSummary = await getValueOfColumnSummary(wal.hrl[1], wal.context?.columnId, wal.context?.sumType, store, "true")
              console.log(valueOfSummary)
              cellValues[variable.name] = valueOfSummary
              break
            case "Table":
              console.log("table")
              const tableValues = await getTableValues(wal.hrl[1], store)
              console.log(tableValues)
              cellValues[variable.name] = tableValues
              break
            case "Row":
              console.log("row")
              const rowValues = await getRowValues(wal.hrl[1], wal.context?.rowId, store)
              console.log(rowValues)
              cellValues[variable.name] = rowValues
              break
            case "Column":
              console.log("column")
              const columnValues = await getColumnValues(wal.hrl[1], wal.context?.columnId, store)
              console.log(columnValues)
              cellValues[variable.name] = columnValues
              console.log(cellValues)
              break
          }
        } catch (error) {
          console.error(`Error loading cell value for variable ${variable.name}:`, error);
          cellValues[variable.name] = undefined; // Set to undefined on error
        }
      }
    }
  }

  const download = (filename: string, text: string) => {
    var element = document.createElement('a');
    element.setAttribute('href', 'data:text/json;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);

    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
  }

  const closeMirror = async () => {
    await store.closeActiveMirror(false);
  };

  const leaveMirror = async () => {
    await store.closeActiveMirror(true);
  };

  onMount(async () => {
    try {
      await setCellValues();
    } catch (error) {
      console.error("Error in initial setCellValues:", error);
    }
    
    setTimeout(async () => {
      console.log("Setting cell values")
      try {
        await setCellValues();
        console.log("Cell Values: ", cellValues)
      } catch (error) {
        console.error("Error in delayed setCellValues:", error);
      }
    }, 1000)
  });
  // setInterval(async() => {
  //   console.log("Setting cell values")
  //   await setCellValues();
  // }, 8000)
</script>

<div class="mirror" >
  {#if activeMirror.hash}
    <EditMirrorDialog {activeHashB64} mirrorHash={activeMirror.hash} name={$state.name} raw={$state.raw} variables={$state.variables} bind:this={editMirrorDialog}
      on:mirror-updated={async (newMirror) => {
        // await new Promise(r => setTimeout(r, 2000));
        console.log("Mirror updated", newMirror);
        await setCellValues();
      }}
    ></EditMirrorDialog>
  {/if}

  {#if showSettings}
    <div class="top-bar">
      <div class="left-items">
        {#if standAlone}
          <h2>{$state.name}</h2>
        {:else}
          <button class="mirror-button close" on:click={closeMirror} title="Close">
            <SvgIcon icon=faClose size="12px"/>
          </button>
          <button class="mirror-button title" title="View title">
            <strong style="font-size: 1em;">{$state.name}</strong>
          </button>
          <button class="mirror-button" on:click={() => {
            const jsonData = {
              name: $state.name,
              variables: $state.variables,
              raw: $state.raw
            };
            download($state.name + '.json', JSON.stringify(jsonData, null, 2));
          }} title="Export">
            <SvgIcon icon="faFileExport" style="opacity: .5;" size="14px" /> <span>Export</span>
          </button>
          <button class="mirror-button" on:click={() => {
            store.archiveMirror(activeMirror.hash)
          }} title="Archive">
            <SvgIcon icon="faArchive" style="opacity: .5;" size="14px" /> <span>Archive</span>
          </button>
          <button class="mirror-button" on:click={leaveMirror} title="Leave View">
            <SvgIcon icon="faArrowTurnDown" style="opacity: .5;" size="12px" /> <span>Leave</span>
          </button>
          <button class="mirror-button" on:click={()=> { 
            editMode = !editMode; 
            if (editMode && $state) { 
              name = $state.name || ""; 
              raw = $state.raw || ""; 
              variables = cloneDeep($state.variables) || []; 
            }
          }} title={editMode ? 'Close Edit Mode' : 'Edit View'}>
            <SvgIcon icon="faEdit" style="opacity: .5;" size="14px"/> <span>{editMode ? 'View' : 'Edit'}</span>
          </button>
          {#if store.weClient}
            <button title="Add View to Pocket" class="mirror-button" on:click={()=>walToPocket()} >          
              <SvgIcon icon="addToPocket" size="20px"/>
            </button>
          {/if}
        {/if}
      </div>
    </div>
  {/if}
  {#if $state}
  
    {@const rawSubbed = (editMode ? raw : $state.raw).replace(/!inject{(.*?)}/g, (match, p1) => {
      const variable = (editMode ? variables : $state.variables).find(v => v.name === p1);
      // if variable is array, return the array as a string. otherwise return value
      if (Array.isArray(cellValues[p1])) {
        return JSON.stringify(cellValues[p1]);
      } else {
        return cellValues[p1];
      }
      // return variable ? JSON.stringify(cellValues[p1]) : match;
    })}
    
    {#if editMode}
      <div class="split-wrapper">
        <div class="split-left">
          <div class="editor-panel">
            {#if !variablesSectionCollapsed}
              <input class='title-input' placeholder="Title" maxlength="60" bind:value={name} />
              
              <div class="variables-section">
                <h3>Variables</h3>
                {#each variables as variable, i}
                  <div class="variable-item">
                    <input class='var-name' placeholder="variable name" maxlength="60" bind:value={variable.name}/>
                    <div class="button-group">
                      <button
                        class="btn-assign"
                        on:click={() => {
                          currentVariableIndex = i;
                          showDataPicker = true;
                        }}
                      >Assign</button>
                      <button class="btn-remove" on:click={() => variables = variables.filter((v, j) => j !== i)}>✕</button>
                    </div>
                    {#if variable.value}
                      <div 
                        class="var-preview"
                        class:copied={copiedVariableIndex === i}
                        on:click={() => {
                          const textToCopy = `!inject{${variable.name}}`;
                          navigator.clipboard.writeText(textToCopy).then(() => {
                            console.log('Copied to clipboard:', textToCopy);
                            copiedVariableIndex = i;
                            setTimeout(() => {
                              copiedVariableIndex = -1;
                            }, 1500);
                          }).catch(err => {
                            console.error('Failed to copy:', err);
                          });
                        }}
                        title="Click to copy !inject{`{${variable.name}}`}"
                      >
                        {#if copiedVariableIndex === i}
                          <span class="copied-indicator">✓ Copied!</span>
                        {:else}
                          <b>!inject{"{" + variable.name + "}"}</b> =
                          {JSON.stringify(cellValues[variable.name])}
                        {/if}
                      </div>
                    {/if}
                  </div>
                {/each}
                <button class="btn-add-var" on:click={() => variables = [...variables, {name: "var_" + (variables.length + 1), value: ""}]}>
                  + Add Variable
                </button>
              </div>
            {/if}
            
            <div class="code-section" class:expanded={variablesSectionCollapsed}>
              <div class="code-header">
                <h3>HTML/CSS/JavaScript</h3>
                <button class="btn-toggle" on:click={() => variablesSectionCollapsed = !variablesSectionCollapsed}>
                  {variablesSectionCollapsed ? '▼ Show Title/Variables' : '▲ Expand code editor'}
                </button>
              </div>
              <div bind:this={editorElement} class="ace-editor" class:expanded={variablesSectionCollapsed}></div>
            </div>
          </div>
        </div>
        
        <div class="split-right">
          <div class="preview-label">Preview</div>
          <iframe srcdoc={rawSubbed}></iframe>
        </div>
      </div>
    {:else}
      <div class="second-row">
        <iframe srcdoc={rawSubbed}></iframe>
      </div>
    {/if}
  {/if}
  
  {#if showDataPicker}
    <div class="modal-overlay" on:click={() => showDataPicker = false}>
      <div class="modal-content" on:click|stopPropagation>
        <h3>Assign Data to Variable</h3>
        
        <div class="picker-section">
          <label>Data Type:</label>
          <select bind:value={dataType}>
            <option value="table">Table</option>
            <option value="row">Row</option>
            <option value="column">Column</option>
            <option value="cell">Cell</option>
          </select>
        </div>
        
        {#if $allBoards.status == "pending"}
          <div class="picker-section">
            <label>Select Board:</label>
            <div>Loading boards...</div>
          </div>
        {:else if $allBoards.status == "complete"}
          <div class="picker-section">
            <label>Select Board:</label>
            <select bind:value={selectedBoard}>
              <option value={null}>-- Select a board --</option>
              {#each Array.from($allBoards.value.entries()) as [hash, board]}
                <option value={hash}>{board.latestState.name}</option>
              {/each}
            </select>
          </div>
        {:else if $allBoards.status == "error"}
          <div class="picker-section">
            <label>Select Board:</label>
            <div>Error: {$allBoards.error}</div>
          </div>
        {/if}
        
        {#if selectedBoard && (dataType === 'column' || dataType === 'cell')}
          {#if selectedBoardData && $selectedBoardData.status == "complete"}
            <div class="picker-section">
              <label>Select Column:</label>
              <select bind:value={selectedColumn}>
                <option value={null}>-- Select a column --</option>
                {#each $selectedBoardData.value.latestState.columnDefs || [] as colDef}
                  <option value={colDef.id}>{colDef.name}</option>
                {/each}
              </select>
            </div>
          {:else if selectedBoardData && $selectedBoardData.status == "pending"}
            <div class="picker-section">
              <label>Select Column:</label>
              <div>Loading columns...</div>
            </div>
          {/if}
        {/if}
        
        {#if selectedBoard && (dataType === 'row' || dataType === 'cell')}
          {#if selectedBoardData && $selectedBoardData.status == "complete"}
            <div class="picker-section">
              <label>Select Row:</label>
              <select bind:value={selectedRow}>
                <option value={null}>-- Select a row --</option>
                {#each $selectedBoardData.value.latestState.rows || [] as row, idx}
                  <option value={row.id}>Row {idx + 1}</option>
                {/each}
              </select>
            </div>
          {:else if selectedBoardData && $selectedBoardData.status == "pending"}
            <div class="picker-section">
              <label>Select Row:</label>
              <div>Loading rows...</div>
            </div>
          {/if}
        {/if}
        
        <div class="modal-actions">
          <button class="btn-cancel" on:click={() => showDataPicker = false}>Cancel</button>
          <button class="btn-confirm" on:click={async () => {
            if (currentVariableIndex >= 0 && selectedBoard) {
              const boardHash = selectedBoard;
              let wal;
              
              switch(dataType) {
                case 'table':
                  wal = { hrl: [store.dnaHash, boardHash], context: { assetType: 'Table' } };
                  variables[currentVariableIndex].value = weaveUrlFromWal(wal);
                  cellValues[variables[currentVariableIndex].name] = await getTableValues(boardHash, store);
                  break;
                case 'row':
                  if (selectedRow) {
                    wal = { hrl: [store.dnaHash, boardHash], context: { assetType: 'Row', rowId: selectedRow } };
                    variables[currentVariableIndex].value = weaveUrlFromWal(wal);
                    cellValues[variables[currentVariableIndex].name] = await getRowValues(boardHash, selectedRow, store);
                  }
                  break;
                case 'column':
                  if (selectedColumn) {
                    wal = { hrl: [store.dnaHash, boardHash], context: { assetType: 'Column', columnId: selectedColumn } };
                    variables[currentVariableIndex].value = weaveUrlFromWal(wal);
                    cellValues[variables[currentVariableIndex].name] = await getColumnValues(boardHash, selectedColumn, store);
                  }
                  break;
                case 'cell':
                  if (selectedRow && selectedColumn) {
                    wal = { hrl: [store.dnaHash, boardHash], context: { assetType: 'Cell', cellId: { rowId: selectedRow, columnId: selectedColumn } } };
                    variables[currentVariableIndex].value = weaveUrlFromWal(wal);
                    cellValues[variables[currentVariableIndex].name] = await getValueOfCell(boardHash, selectedRow, selectedColumn, store);
                  }
                  break;
              }
              
              showDataPicker = false;
              selectedBoard = null;
              selectedColumn = null;
              selectedRow = null;
              currentVariableIndex = -1;
            }
          }}>Assign</button>
        </div>
      </div>
    </div>
  {/if}
</div>
<style>
  .left-items {
    display: flex;
  }

  .left-items > * {
    padding: 6px 12px !important; 
  }

  iframe {
    border: none;
    background-color: white;
  }
  iframe > html {
    height: fit-content;
  }

  body, html {width: 100%; height: 100%; margin: 0; padding: 0}
  .first-row {position: absolute;top: 0; left: 0; right: 0; height: 0px; background-color: lime;}
  .second-row {
    position: absolute; 
    /* top: 100px;  */
    height: calc(100vh - 45px);
    left: 0; 
    right: 0; 
    /* bottom: 0;  */
    background-color: red 
  }
  .second-row iframe {display: block; width: 100%; height: 100%; border: none;}

  .mirror-button {
    background: transparent;
    border: none;
    color: #000;
    cursor: pointer;
    padding: 0 12px;
    margin: 0;
  }

  .mirror-button:hover {
    background: rgb(167, 167, 167);
  }

  .split-wrapper {
    display: flex;
    height: calc(100vh - 124px);
    width: calc(100vw - 20px);
  }

  .split-left {
    width: 100%;
    max-width: 700px;
    min-width: 300px;
    height: 100%;
    overflow-y: auto;
    background: #f5f5f5;
    padding: 20px;
    box-sizing: border-box;
  }

  .split-right {
    width: 100%;
    height: 100%;
    overflow: hidden;
    position: relative;
    background: white;
  }

  .split-right iframe {
    width: 100%;
    height: 100%;
    border: none;
  }

  .preview-label {
    position: absolute;
    top: 10px;
    right: 10px;
    background: rgba(0,0,0,0.7);
    color: white;
    padding: 5px 10px;
    border-radius: 4px;
    font-size: 12px;
    z-index: 10;
  }

  .editor-panel {
    display: flex;
    flex-direction: column;
    gap: 20px;
    height: 100%;
  }

  .title-input {
    width: 100%;
    padding: 12px;
    font-size: 18px;
    font-weight: bold;
    border: 2px solid #ddd;
    border-radius: 4px;
    background: white;
  }

  .variables-section h3, .code-section h3 {
    margin: 0 0 10px 0;
    color: #333;
    font-size: 16px;
  }

  .variable-item {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px;
    background: white;
    border: 1px solid #ddd;
    border-radius: 4px;
    margin-bottom: 10px;
  }

  .var-name {
    flex: 1;
    padding: 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
  }

  .button-group {
    display: flex;
    gap: 8px;
  }

  .btn-assign {
    background: #8b8b8b;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    flex: 1;
  }

  .btn-assign:hover {
    background: #aeaeae;
  }

  .btn-remove {
    background: #f44336;
    color: white;
    border: none;
    padding: 8px 12px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
  }

  .btn-remove:hover {
    background: #d32f2f;
  }

  .var-preview {
    padding: 8px;
    background: #f9f9f9;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    font-size: 12px;
    font-family: monospace;
    max-height: 100px;
    overflow-y: auto;
    cursor: pointer;
    transition: background 0.2s;
  }

  .var-preview:hover {
    background: #e8f5e9;
    border-color: #4caf50;
  }

  .var-preview.copied {
    background: #c8e6c9;
    border-color: #4caf50;
  }

  .copied-indicator {
    color: #2e7d32;
    font-weight: bold;
    font-family: sans-serif;
  }

  .btn-add-var {
    background: #4caf50;
    width: 100%;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    margin-top: 10px;
  }

  .btn-add-var:hover {
    background: #45a049;
  }

  .code-section {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
  }

  .code-section.expanded {
    flex: 1;
    height: calc(100vh - 140px);
  }

  .code-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .code-header h3 {
    margin: 0;
  }

  .btn-toggle {
    background: #666;
    color: white;
    border: none;
    padding: 6px 12px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 13px;
  }

  .btn-toggle:hover {
    background: #555;
  }

  .ace-editor {
    width: 100%;
    height: 400px;
    border: 2px solid #ddd;
    border-radius: 4px;
  }

  .ace-editor.expanded {
    height: calc(100vh - 190px);
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
    padding: 24px;
    border-radius: 8px;
    max-width: 500px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
  }

  .modal-content h3 {
    margin: 0 0 20px 0;
    color: #333;
  }

  .picker-section {
    margin-bottom: 16px;
  }

  .picker-section label {
    display: block;
    margin-bottom: 8px;
    font-weight: 500;
    color: #555;
  }

  .picker-section select {
    width: 100%;
    padding: 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 14px;
  }

  .modal-actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
    margin-top: 24px;
  }

  .btn-cancel {
    background: #757575;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
  }

  .btn-cancel:hover {
    background: #616161;
  }

  .btn-confirm {
    background: #4caf50;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
  }

  .btn-confirm:hover {
    background: #45a049;
  }
  
  iframe {
    border: none;
    background-color: white;
  }
  iframe > html {
    height: fit-content;
  }

  body, html {width: 100%; height: 100%; margin: 0; padding: 0}
  .first-row {position: absolute;top: 0; left: 0; right: 0; height: 0px; background-color: lime;}
  .second-row {
    position: absolute; 
    /* top: 100px;  */
    height: calc(100vh);
    left: 0; 
    right: 0; 
    /* bottom: 0;  */
    background-color: red 
  }
  .second-row iframe {display: block; width: 100%; height: 100%; border: none;}

  .mirror-button {
    background: transparent;
    border: none;
    color: #000;
    cursor: pointer;
    padding: 0 12px;
    margin: 0;
  }

  .mirror-button:hover {
    background: rgb(167, 167, 167);
  }
</style>