// Very rudimentary auto-completion
//
// Only complete "pytch." and "self.", with hard-coded list of options
// based on the public module functions and base-class methods.

import { IAceEditor } from "react-ace/lib/types";

interface IAceCompletion {
  caption: string;
  value: string;
  meta?: string;
  message: string;
}

const completionFromPyTuple = (meta: string | null) => (tup: any) => ({
  caption: tup.v[0].v + tup.v[1].v,
  value: tup.v[0].v,
  meta,
  message: tup.v[3].v,
});

const completionsFromPyList = (meta: string | null, lst: any) =>
  lst.v.map(completionFromPyTuple(meta));

export class PytchAceAutoCompleter {
  // TODO: Proper types for the remaining arguments.
  getCompletions(
    _editor: IAceEditor,
    session: any,
    pos: any,
    prefix: string,
    callback: any
  ) {
    const cursorLine = session.getLine(pos.row);
    const lineHead = cursorLine.substring(0, pos.column);

    if (!lineHead.endsWith(prefix)) {
      // TODO: What's the right way to report this error to Ace?
      callback(null, []);
    }

    const prePrefixLength = lineHead.length - prefix.length;
    const prePrefix = lineHead.substring(0, prePrefixLength);

    const candidates = prePrefix.endsWith("pytch.")
      ? completionsPytchBuiltin
      : prePrefix.endsWith("self.")
      ? completionsActorMethod
      : [];

    callback(null, candidates);
  }
}
