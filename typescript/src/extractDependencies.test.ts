import { TestScheduler } from "jest"
import * as fs from "fs";
import {extractDependencies} from "../src/extractDependencies"
import { isExportDeclaration } from "typescript";

let testProgram = `dialect "standard"
import "ast" as ast
import "buildinfo" as buildinfo
import "genjs" as genjs
import "identifierresolution" as identifierresolution
import "errormessages" as errormessages
import "io" as io
import "lexer" as lexer
import "parser" as parser
import "sys" as sys
import "unicode" as unicode
import "util" as util
import "xmodule" as xmodule
import "mirror" as mirror

if (mirror.initialModuleName == "compiler") then { compileInputFile }

method compileInputFile {
    util.parseargs(buildinfo)

    util.log_verbose "starting compilation"
    ...
}
`;

test("find the early imports", () => {
    const result:String[] = extractDependencies(testProgram);
    expect(result).toContain("standard");
    expect(result).toContain("ast");
    expect(result).toContain("buildinfo");
    expect(result).toContain("genjs");
    expect(result).toContain("identifierresolution");
    expect(result).toContain("errormessages");
    expect(result).toContain("io");
    expect(result).toContain("lexer");
    expect(result).toContain("parser");
    expect(result).toContain("sys");
});

test("find the later imports", () => {
    const result:String[] = extractDependencies(testProgram);
    expect(result).toContain("unicode");
    expect(result).toContain("util");
    expect(result).toContain("xmodule");
    expect(result).toContain("mirror");
});

test("a program with nothing but imports", () => {
    let first6:String[] = testProgram.split("\n", 6);
    const justImports = first6.join("\n");
    const result:String[] = extractDependencies(justImports);
    expect(result).toContain("standard");
    expect(result).toContain("ast");
    expect(result).toContain("buildinfo");
    expect(result).toContain("genjs");
    expect(result).toContain("identifierresolution");
    expect(result).toContain("errormessages");
});

test("a program without dialect statement", () => {
    let first6:String[] = testProgram.split("\n", 7);
    first6.shift();     // removes element 0, the dialect statement
    const justImports = first6.join("\n");
    const result:String[] = extractDependencies(justImports);
    expect(result).toContain("standard");
    expect(result).toContain("ast");
    expect(result).toContain("buildinfo");
    expect(result).toContain("genjs");
    expect(result).toContain("identifierresolution");
    expect(result).toContain("errormessages");
    expect(result).toContain("io");
});