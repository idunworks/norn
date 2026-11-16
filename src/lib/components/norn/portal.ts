/**
 * Move a node to <body>. Site layouts wrap pages in `relative z-10`, a
 * stacking context that keeps any modal inside it under the sticky header
 * (z-50) whatever its own z-index. A dialog rendered at <body> escapes it.
 */
export function portal(node: HTMLElement): { destroy: () => void } {
	document.body.appendChild(node);
	return {
		destroy() {
			node.remove();
		}
	};
}
