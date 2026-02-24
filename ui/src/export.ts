import type { BoardState } from "./board"
import type { MirrorState } from "./mirror"
import sanitize from "sanitize-filename";

interface BoardsExport {
    version: string,
    boards: Array<BoardState>,
    mirrors?: Array<MirrorState>
}

const EXPORT_FORMAT_VERSION = "1"
const PREFIX = "tables"
const download = (filename: string, text: string) => {
    var element = document.createElement('a');
    element.setAttribute('href', 'data:text/json;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);

    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
}

export const exportBoard = (state: BoardState) => {
    const fileName = sanitize(`${PREFIX}_export_${state.name}.json`)
    _exportBoards(fileName, [state])
}

export const exportBoards = (boards: Array<BoardState>, mirrors: Array<MirrorState> = []) => {
    const date = new Date();
    const formattedDate = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}-`
        + date.getHours() + "_" + ("00" + date.getMinutes()).slice(-2) +"_"+ ("00" + date.getSeconds()).slice(-2)

    const fileName = sanitize(`${PREFIX}_export_${formattedDate}.json`)
    _exportBoards(fileName, boards, mirrors)
}

const _exportBoards = (fileName:string, boards: Array<BoardState>, mirrors: Array<MirrorState> = []) => {
    const exportObject: BoardsExport = {
        version: EXPORT_FORMAT_VERSION,
        boards,
        mirrors,
    }
    download(fileName, JSON.stringify(exportObject))
}

export const deserializeExport = (jsonExport:string) : {boards: Array<BoardState>, mirrors: Array<MirrorState>} => {
    try {
        const parsed = JSON.parse(jsonExport)
        
        let boards: Array<BoardState> = []
        let mirrors: Array<MirrorState> = []
        
        // Check if it's the new format with version
        if (parsed.version) {
            boards = parsed.boards || []
            mirrors = parsed.mirrors || []
        } 
        // Check if it's an old format (direct array of boards)
        else if (Array.isArray(parsed)) {
            boards = parsed
        }
        // Check if it's a single board object
        else if (parsed.name && parsed.rows) {
            boards = [parsed]
        }
        // Check if it's a single mirror object
        else if (parsed.name && parsed.raw) {
            mirrors = [parsed]
        }
        else {
            throw("Unrecognized export format")
        }

        // sanitize for things that may be missing from previous exports
        for (const board of boards) {
            if (!board.props) {
                board.props = { bgUrl: "", attachments: [] }
            }
            if (!board.props.attachments) {
                board.props.attachments = []
            }
            // for (const card of board.cards) {
            //     if (!card.props.attachments) {
            //         card.props.attachments = []
            //     }
            // }

        }
        
        // sanitize mirrors
        for (const mirror of mirrors) {
            if (!mirror.props) {
                mirror.props = { bgUrl: "", attachments: [] }
            }
            if (!mirror.props.attachments) {
                mirror.props.attachments = []
            }
            if (!mirror.variables) {
                mirror.variables = []
            }
            if (!mirror.feed) {
                mirror.feed = {}
            }
            if (!mirror.boundTo) {
                mirror.boundTo = []
            }
        }
        
        return {boards, mirrors}

    } catch (e) {
        console.log("Error importing tables:", e)
        return {boards: [], mirrors: []}
    }
}