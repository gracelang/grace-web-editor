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
    expect(kahnTopologicalSort(g)).toStrictEqual([rootNode, requiredNode]);
});

test("sort a graph of 3 nodes in a chain", () => {
    let g:Graph = new Graph();
    let rootNode:GNode = new GNode("R");
    g.addNode(rootNode);
    let requiredNode1:GNode = new GNode("D1");
    g.addNode(requiredNode1);
    g.addEdge(rootNode, requiredNode1);
    let requiredNode2:GNode = new GNode("D2");
    g.addNode(requiredNode2);
    g.addEdge(requiredNode1, requiredNode2);
    expect(kahnTopologicalSort(g)).toStrictEqual([rootNode, requiredNode1, requiredNode2]);
});

test("sort a graph of 3 nodes in a V", () => {
    let g:Graph = new Graph();
    let rootNode:GNode = new GNode("R");
    g.addNode(rootNode);
    let requiredNode1:GNode = new GNode("D1");
    g.addNode(requiredNode1);
    g.addEdge(rootNode, requiredNode1);
    let requiredNode2:GNode = new GNode("D2");
    g.addNode(requiredNode2);
    g.addEdge(rootNode, requiredNode2);
    expect(kahnTopologicalSort(g)).toStrictEqual([rootNode, requiredNode1, requiredNode2]);
});

test("sort a graph of 5 nodes in a V", () => {
    let g:Graph = new Graph();
    let rootNode:GNode = new GNode("R");
    g.addNode(rootNode);
    let d1:GNode = new GNode("D1");
    g.addNode(d1);
    g.addEdge(rootNode, d1);
    let e1:GNode = new GNode("E1");
    g.addNode(e1);
    g.addEdge(rootNode, e1);
    let d2:GNode = new GNode("D2");
    g.addNode(d2);
    g.addEdge(rootNode, d2);
    let e2:GNode = new GNode("E2");
    g.addNode(e2);
    g.addEdge(rootNode, e2);
    expect(kahnTopologicalSort(g)).toStrictEqual([rootNode, d1, e1, d2, e2]);
});

test("sort a cyclic graph of 3 nodes", () => {
    let g:Graph = new Graph();
    let rootNode:GNode = new GNode("R");
    g.addNode(rootNode);
    let d1:GNode = new GNode("D1");
    g.addNode(d1);
    g.addEdge(rootNode, d1);
    let d2:GNode = new GNode("D2");
    g.addNode(d2);
    g.addEdge(d1, d2);
    g.addEdge(d2, rootNode);
    expect(() => {kahnTopologicalSort(g)}).toThrowError("graph has cycle");
});