import {GNode, Graph, kahnTopologicalSort} from "../src/toposort"


test("Make a Graph", () => {
        let g:Graph = new Graph();
        let rootNode:GNode = new GNode("R");
        g.addNode(rootNode);
        expect(g.hasEdges).toBe(false);
        let requiredNode:GNode = new GNode("D")
        g.addNode(requiredNode);
        g.addEdge(rootNode, requiredNode);
        expect(g.hasEdges).toBe(true);        
});

test("sort a graph of 2 nodes", () => {
    let g:Graph = new Graph();
    let rootNode:GNode = new GNode("R");
    g.addNode(rootNode);
    let requiredNode:GNode = new GNode("D");
    g.addNode(requiredNode);
    g.addEdge(rootNode, requiredNode);
    expect(kahnTopologicalSort(g)).toBe([rootNode, requiredNode]);
});

