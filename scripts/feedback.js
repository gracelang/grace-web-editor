// Sets up the various parts of the feedback system.

"use strict";

var compilation, output, testoutput;

compilation = require("./feedback/compilation");
output = require("./feedback/output");
testoutput = require("./feedback/testoutput");

exports.setup = function (feedback, onBuild, onRun) {
  var comp, op, t_op;

  // This is where the output object is instantiated.
  op = output.setup(feedback.find(".output"));
  t_op = testoutput.setup(feedback.find(".testoutput"));
  comp = compilation.setup(feedback.find(".compilation"), op, function () {
    op.clear();
    onBuild();
  }, onRun);

  // Stabilise the feedback width so that writing overly long lines to the
  // output does not cause it to wrap.
  feedback.width(feedback.width()).resize(function () {
    feedback.width(null).width(feedback.width());
  });

  return {
    "compilation": comp,
    "output": t_op,
    "testoutput": t_op,

    "running": function () {
      op.clear();
      comp.running();
    },

    "error": function (reason, gotoLine) {
      comp.waiting();
      op.error(reason, gotoLine);
    }
  };
};
