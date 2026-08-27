"""Support CommonMark-style lazy continuation blocks in list items.

Python-Markdown treats blank-line-separated list item continuations as nested
blocks only when they are indented by four spaces. CommonMark allows the
continuation to align with the list item's content column, so common forms like
``1. item`` followed by a blank line and a three-space-indented paragraph stay
inside the list item.
"""

from __future__ import annotations

import re
import xml.etree.ElementTree as etree

from markdown.blockparser import BlockParser
from markdown.blockprocessors import BlockProcessor
from markdown.extensions import Extension


class ListContinuationProcessor(BlockProcessor):
    """Attach 2- or 3-space continuation blocks to the previous list item."""

    INDENT_RE = re.compile(r"^( {2,3})(?=\S)")

    def test(self, parent: etree.Element, block: str) -> bool:
        if block.startswith(" " * self.tab_length):
            return False

        sibling = self.lastChild(parent)
        if sibling is None or sibling.tag not in {"ol", "ul"} or not len(sibling):
            return False
        if sibling[-1].tag != "li":
            return False

        match = self.INDENT_RE.match(block)
        if not match:
            return False

        indent = len(match.group(1))
        return indent >= self._required_indent(sibling)

    def run(self, parent: etree.Element, blocks: list[str]) -> None:
        block = blocks.pop(0)
        sibling = self.lastChild(parent)
        if sibling is None or not len(sibling):
            return

        indent = len(self.INDENT_RE.match(block).group(1))  # type: ignore[union-attr]
        block = self._loose_detab(block, indent)

        item = sibling[-1]
        if item.text:
            paragraph = etree.Element("p")
            paragraph.text = item.text
            item.text = ""
            item.insert(0, paragraph)

        self.parser.parseChunk(item, block)

    @staticmethod
    def _required_indent(list_node: etree.Element) -> int:
        return 3 if list_node.tag == "ol" else 2

    @staticmethod
    def _loose_detab(text: str, indent: int) -> str:
        prefix = " " * indent
        return "\n".join(
            line[indent:] if line.startswith(prefix) else line
            for line in text.split("\n")
        )


class ListContinuationExtension(Extension):
    """Register the list continuation processor."""

    def extendMarkdown(self, md):
        md.parser.blockprocessors.register(
            ListContinuationProcessor(md.parser),
            "notebook_list_continuation",
            85,
        )


def makeExtension(**kwargs):
    return ListContinuationExtension(**kwargs)
