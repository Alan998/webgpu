// WebGPU is an asynchrounous API, so use it in an async function
async function main() {
	// request an adapter
	const adapter = await navigator.gpu?.requestAdapter();
	
	// request GPU device from the adapter
	const device = await adapter?.requestDevice();

	if (!device) {
		// browser does not support WebGPU
		fail('Need a browser that supports WebGPU');
		return;
	} else {
		console.log('Browser supports WebGPU, Yay!');
	}
}

main();
