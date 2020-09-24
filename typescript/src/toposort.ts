export class Graph {
    nodes: Set<GNode>;
    constructor() {
        this.nodes = new Set<GNode>();
    }
    removeEdge(src:GNode, dest:GNode):void {
        dest.incomingEdges.delete(src);
    }
    addNode(n:GNode):void {
        this.nodes.add(n);
    }
    addEdge(src:GNode, dest:GNode):void {
        dest.incomingEdges.add(src);
    }
    get hasEdges():boolean {
        for (const n of this.nodes) {
            if (n.incomingEdges.size > 0) return true;
        }
        return false;
    }
}

export class GNode {
    name: string;
    incomingEdges: Set<GNode>;

    constructor(nodeName:string, requiredBy?:Set<GNode>) {
        this.name = nodeName;
        this.incomingEdges = (requiredBy == undefined) ? 
                                new Set<GNode>() : requiredBy;
    }
    get isStartNode():boolean {
        return this.incomingEdges.size === 0;
    }
}

export function kahnTopologicalSort(g:Graph) {
    let result:Array<GNode> = [];
    let s:Array<GNode> = Array.from(g.nodes).filter(n => n.isStartNode);
    // ugh!  why are sets not filterable?

    while (s.length !== 0) {
        const n:GNode = (s.shift() as GNode);
        result.push(n);
        console.log("added " + n.name);
        for (const m of g.nodes) {
            if ((m.incomingEdges.has(n))) {
                g.removeEdge(n, m);
                if (m.isStartNode) {
                    s.push(m);
                }
            }
        }
    }
    if (g.hasEdges) {
        throw ("graph has cycle");
    } else {
        return result;
    }
}