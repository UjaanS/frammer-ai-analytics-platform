from __future__ import annotations

import re
from collections.abc import Iterable
from pathlib import Path


INSERT_RE = re.compile(r"INSERT INTO `([^`]+)` \((.*?)\) VALUES\s*", re.DOTALL)


def read_selected_inserts(path: Path, selected_columns: dict[str, set[str]]) -> dict[str, list[dict[str, str | None]]]:
    """Read only allowlisted columns from MySQL INSERT statements.

    The source dump may contain credentials and request payloads. They are
    deliberately never copied into the returned dictionaries.
    """

    text = path.read_text(encoding="utf-8", errors="replace")
    selected_rows = {table: [] for table in selected_columns}
    position = 0

    while match := INSERT_RE.search(text, position):
        table = match.group(1)
        end = _find_statement_end(text, match.end())
        position = end + 1
        if table not in selected_columns:
            continue

        columns = [column.strip().strip("`") for column in match.group(2).split(",")]
        allowed_indexes = [
            (index, column) for index, column in enumerate(columns) if column in selected_columns[table]
        ]
        for values in _tuple_rows(text[match.end() : end]):
            selected_rows[table].append(
                {column: values[index] if index < len(values) else None for index, column in allowed_indexes}
            )

    return selected_rows


def _find_statement_end(text: str, start: int) -> int:
    quote: str | None = None
    escaped = False
    for index in range(start, len(text)):
        character = text[index]
        if quote:
            if escaped:
                escaped = False
            elif character == "\\":
                escaped = True
            elif character == quote:
                quote = None
        elif character == "'":
            quote = character
        elif character == ";":
            return index
    return len(text)


def _tuple_rows(values: str) -> Iterable[list[str | None]]:
    quote: str | None = None
    escaped = False
    depth = 0
    start: int | None = None

    for index, character in enumerate(values):
        if quote:
            if escaped:
                escaped = False
            elif character == "\\":
                escaped = True
            elif character == quote:
                quote = None
            continue

        if character == "'":
            quote = character
        elif character == "(":
            if depth == 0:
                start = index + 1
            depth += 1
        elif character == ")":
            depth -= 1
            if depth == 0 and start is not None:
                yield [_decode_value(item) for item in _split_list(values[start:index])]
                start = None


def _split_list(values: str) -> list[str]:
    items: list[str] = []
    quote: str | None = None
    escaped = False
    depth = 0
    start = 0

    for index, character in enumerate(values):
        if quote:
            if escaped:
                escaped = False
            elif character == "\\":
                escaped = True
            elif character == quote:
                quote = None
            continue

        if character in {"'", '"'}:
            quote = character
        elif character in "([{":
            depth += 1
        elif character in ")]}":
            depth -= 1
        elif character == "," and depth == 0:
            items.append(values[start:index].strip())
            start = index + 1

    items.append(values[start:].strip())
    return items


def _decode_value(value: str) -> str | None:
    value = value.strip()
    if value.upper() == "NULL":
        return None
    if len(value) >= 2 and value[0] == "'" and value[-1] == "'":
        return (
            value[1:-1]
            .replace("\\\\", "\0")
            .replace("\\'", "'")
            .replace('\\"', '"')
            .replace("\\n", "\n")
            .replace("\\r", "\r")
            .replace("\\t", "\t")
            .replace("\0", "\\")
        )
    return value
