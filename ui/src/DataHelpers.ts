import { ColumnType, SumType, type Cell, Board, ColumnDef } from './board'; // replace with the actual path to your 'board' module
import { decodeHashFromBase64 } from "@holochain/client";
import type { EntryHash } from "@holochain/client";
import { stringToColor } from './util'; // replace with the actual path to your 'util' module
import type { TablesStore } from './store'; // replace with the actual path to your 'store' module

export async function getValueOfCell(tableHash: EntryHash, rowId: string, columnId: string, store: TablesStore) {
  return new Promise((resolve, reject) => {
    store.boardList.boardData2.get(tableHash).subscribe((boardData) => {
      console.log("board data", boardData)
      if (!boardData) {
        throw new Error(`Table with id ${tableHash} not found`);
      }

      if (!boardData.value || !boardData.value.latestState) {
        throw new Error(`No latest state found for table ${tableHash}`);
      }

      const row = boardData.value.latestState.rows.find(r => r.id === rowId);
      if (!row) {
        throw new Error(`Row with id ${rowId} not found in table ${tableHash}`);
      }

      const cell = row.cells[columnId];
      if (!cell) {
        throw new Error(`Cell with column id ${columnId} not found in row ${rowId} of table ${tableHash}`);
      }

      const def = boardData.value.latestState.columnDefs.find(def => def.id === columnId);
      if (!def) {
        throw new Error(`Column definition for column id ${columnId} not found in table ${tableHash}`);
      }

      switch (def.type) {
        case ColumnType.WeaveAsset:
        case ColumnType.WALEmbed:
          return cell.value; // return the value directly

        case ColumnType.TableLink:
          const linkedBoardHash = def.linkedTable ? decodeHashFromBase64(def.linkedTable) : null;
          const linkedBoardData = def.linkedTable ? store.boardList.boardData2.get(linkedBoardHash) : null;
          const linkedRow = linkedBoardData?.value?.latestState?.rows?.find(r => r.id == cell.value);
          return linkedRow?.cells[def.displayColumn]?.value;

        case ColumnType.User:
          return decodeHashFromBase64(cell.value);

        case ColumnType.Label:
          return stringToColor(cell.value);

        default:
          return resolve(cell.value);
      }
    }, reject);
  });
}

export async function getValueOfColumnSummary(tableHash: EntryHash, columnId: string, sumType:SumType, store: TablesStore, query: string = "true",) {
  return new Promise((resolve, reject) => {
    store.boardList.boardData2.get(tableHash).subscribe((boardData) => {
      if (!boardData) {
        throw new Error(`Table with id ${tableHash} not found`);
      }

      if (!boardData.value || !boardData.value.latestState) {
        throw new Error(`No latest state found for table ${tableHash}`);
      }

      const def = boardData.value.latestState.columnDefs.find(def => def.id === columnId);
      if (!def) {
        throw new Error(`Column definition for column id ${columnId} not found in table ${tableHash}`);
      }

      let querriedData = boardData.value.latestState.rows.filter(row => {
        let subbedQuery = query
        Object.keys(row.cells).forEach((cellId) => {
          let value: any = '"' + row.cells[cellId]?.value + '"'
          if (boardData.value.latestState.columnDefs.find((col) => col.id === cellId)?.type === 1) {
            const tempValue = parseInt(row.cells[cellId]?.value)
            if (!isNaN(tempValue)) {
              value = tempValue
            }
          }
          subbedQuery = subbedQuery.replace(new RegExp(cellId, 'g'), value);
          subbedQuery = subbedQuery.replace(new RegExp('contains', 'g'), 'includes');
        })
        try {
          return eval(subbedQuery) ? true : false
        } catch {
          return false
        }
      })

      switch (Number(sumType)) {
        case SumType.Sum:
          let sum = Object.values(querriedData).reduce((acc, row) => {
            const cell = row.cells[def.id];
            if (cell && cell.value) {
              return acc + Number(cell.value.replace(/[^0-9-.]/g, ''));
            }
            return acc;
          }, 0)
          resolve(sum);
          break
        case SumType.Count:
          resolve(querriedData.length);
          break;
        case SumType.Average:
          console.log("average")
          let sum2 = Object.values(querriedData).reduce((acc, row) => {
            const cell = row.cells[def.id];
            if (cell && cell.value) {
              return acc + Number(cell.value.replace(/[^0-9-.]/g, ''));
            }
            return acc;
          }, 0)
          console.log("sum2", sum2)
          resolve(sum2 / querriedData.length);
          break;
        
        case SumType.Max:
          let max = Object.values(querriedData).reduce((acc, row) => {
            const cell = row.cells[def.id];
            if (cell && cell.value) {
              return Math.max(acc, Number(cell.value.replace(/[^0-9-.]/g, '')));
            }
            return acc;
          }, Number.MIN_SAFE_INTEGER)
          resolve(max);
          break;
        
        case SumType.Min:
          let min = Object.values(querriedData).reduce((acc, row) => {
            const cell = row.cells[def.id];
            if (cell && cell.value) {
              return Math.min(acc, Number(cell.value.replace(/[^0-9-.]/g, '')));
            }
            return acc;
          }, Number.MAX_SAFE_INTEGER)
          resolve(min);
          break;

        case SumType.Median:
          let values = Object.values(querriedData).map((row) => {
            const cell = row.cells[def.id];
            if (cell && cell.value) {
              return Number(cell.value.replace(/[^0-9-.]/g, ''));
            }
            return 0;
          })
          values.sort((a, b) => a - b);
          let median = 0;
          if (values.length % 2 === 0) {
            median = (values[values.length / 2 - 1] + values[values.length / 2]) / 2;
          } else {
            median = values[(values.length - 1) / 2];
          }
          resolve(median);
          break;
        
        case SumType.Mode:
          let modeMap = {};
          let maxCount = 0;
          let modes = [];
          Object.values(querriedData).forEach((row) => {
            const cell = row.cells[def.id];
            if (cell && cell.value) {
              let val = Number(cell.value.replace(/[^0-9-.]/g, ''));
              modeMap[val] = (modeMap[val] || 0) + 1;
              if (modeMap[val] > maxCount) {
                modes = [val];
                maxCount = modeMap[val];
              } else if (modeMap[val] === maxCount) {
                modes.push(val);
              }
            }
          })
          resolve(modes);
          break;
        
        case SumType.Range:
          let values2 = Object.values(querriedData).map((row) => {
            const cell = row.cells[def.id];
            if (cell && cell.value) {
              return Number(cell.value.replace(/[^0-9-.]/g, ''));
            }
            return 0;
          })
          values2.sort((a, b) => a - b);
          let range = values2[values2.length - 1] - values2[0];
          resolve(range);
          break;
        
        case SumType.StDeviation:
          let values3 = Object.values(querriedData).map((row) => {
            const cell = row.cells[def.id];
            if (cell && cell.value) {
              return Number(cell.value.replace(/[^0-9-.]/g, ''));
            }
            return 0;
          })
          let mean = values3.reduce((acc, val) => acc + val, 0) / values3.length;
          let stDeviation = Math.sqrt(values3.reduce((acc, val) => acc + (val - mean) ** 2, 0) / values3.length);
          resolve(stDeviation);
          break;

        case SumType.Filled:
          let filled = Object.values(querriedData).reduce((acc, row) => {
            const cell = row.cells[def.id];
            if (cell && cell.value) {
              return acc + 1;
            }
            return acc;
          }, 0)
          resolve(filled);
          break;

        case SumType.Empty:
          let empty = Object.values(querriedData).reduce((acc, row) => {
            const cell = row.cells[def.id];
            if (!cell || !cell.value) {
              return acc + 1;
            }
            return acc;
          }, 0)
          resolve(empty);
          break;
        
        case SumType.Unique:
          let unique = new Set(Object.values(querriedData).map((row) => {
            const cell = row.cells[def.id];
            if (cell && cell.value) {
              return cell.value;
            }
            return "";
          })).size;
          resolve(unique);
          break;

        default:
          resolve("--");
          break
          
      }
    }, reject);
  });
}

export async function getColumnValues(tableHash: EntryHash, columnId: string, store: TablesStore) {
  return new Promise((resolve, reject) => {
    store.boardList.boardData2.get(tableHash).subscribe((boardData) => {
      if (!boardData) {
        throw new Error(`Table with id ${tableHash} not found`);
      }

      if (!boardData.value || !boardData.value.latestState) {
        throw new Error(`No latest state found for table ${tableHash}`);
      }

      const def = boardData.value.latestState.columnDefs.find(def => def.id === columnId);
      if (!def) {
        throw new Error(`Column definition for column id ${columnId} not found in table ${tableHash}`);
      }

      const values = Object.values(boardData.value.latestState.rows).map(row => {
        const cell = row.cells[columnId];
        if (cell && cell.value) {
          return cell.value;
        }
        return "";
      });

      resolve(values);
    }, reject);
  });
}

export async function getRowValues(tableHash: EntryHash, rowId: string, store: TablesStore) {
  return new Promise((resolve, reject) => {
    store.boardList.boardData2.get(tableHash).subscribe((boardData) => {
      if (!boardData) {
        throw new Error(`Table with id ${tableHash} not found`);
      }

      if (!boardData.value || !boardData.value.latestState) {
        throw new Error(`No latest state found for table ${tableHash}`);
      }

      const row = boardData.value.latestState.rows.find(r => r.id === rowId);
      if (!row) {
        throw new Error(`Row with id ${rowId} not found in table ${tableHash}`);
      }

      const values = Object.values(row.cells).map(cell => {
        if (cell && cell.value) {
          return cell.value;
        }
        return "";
      });

      resolve(values);
    }, reject);
  });
}

export async function getTableValues(tableHash: EntryHash, store: TablesStore) {
  return new Promise((resolve, reject) => {
    store.boardList.boardData2.get(tableHash).subscribe((boardData) => {
      if (!boardData) {
        throw new Error(`Table with id ${tableHash} not found`);
      }

      if (!boardData.value || !boardData.value.latestState) {
        throw new Error(`No latest state found for table ${tableHash}`);
      }

      const values = Object.values(boardData.value.latestState.rows).map(row => {
        return Object.values(row.cells).map(cell => {
          if (cell && cell.value) {
            return cell.value;
          }
          return "";
        });
      });

      resolve(values);
    }, reject);
  });
}