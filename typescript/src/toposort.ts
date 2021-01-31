export class Graph {
    nodes: Map<String, GNode>;
    constructor() {
        this.nodes = new Map<String, GNode>();
    }
    removeEdge(src:GNode, dest:GNode):void {
        dest.incomingEdges.delete(src);
    }
    addNode(n:GNode):void {
        this.nodes.set(n.name, n);
    }
    nodeNamed(n:String):GNode | undefined {
        return this.nodes.get(n);
    }
    addEdge(src:GNode, dest:GNode):void {
        dest.incomingEdges.add(src);
    }
    addEdgeByName(srcName:string, destName:string):void {
        const src = this.possiblyNewNode(srcName);
        const dest = this.possiblyNewNode(destName);
        this.addEdge(src, dest);
    }
    get hasEdges():boolean {
        for (const n of this.nodes.values()) {
            if (n.incomingEdges.size > 0) return true;
        }
        return false;
    }
    addNodeNamed(nodeName:string):boolean {
        // if there is no node with nodeName in this graph, add one
        // and return true; if such a node exists already, return false
        const existsAlready:GNode | undefined = this.nodes.get(nodeName);
        if (existsAlready) { return false; }
        const newNode = new GNode(nodeName);
        this.nodes.set(nodeName, newNode);
        return true;
    }
    possiblyNewNode(nodeName:string):GNode {
        // if there is no node with nodeName in this graph, add one and
        // return it; if such a node exists already, return the existing node
        const existsAlready:GNode | undefined = this.nodes.get(nodeName);
        if (existsAlready) { return existsAlready; }
        const newNode = new GNode(nodeName);
        this.nodes.set(nodeName, newNode);
        return newNode;
    }
    get numberOfNodes():number { 
        return this.nodes.size;
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
    let s:Array<GNode> = Array.from(g.nodes.values()).filter(n => n.isStartNode);
    // ugh!  why are maps not filterable?

    while (s.length !== 0) {
        const n:GNode = (s.shift() as GNode);
        result.push(n);
        for (const m of g.nodes.values()) {
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