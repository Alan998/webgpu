// function to log messages when failing
function fail(msg) {
	alert(msg);
}

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

	// Get a WebGPU context from the canvas and configure it
	const canvas = document.querySelector('canvas');
	const context = canvas.getContext('webgpu');
	// ask the system for preferred format, either "rgba8unorm" or "bgra8unorm"
	const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
	context.configure({
		device, // associate device with canvas
		format: presentationFormat,
	});

	// Create a shader module which contains a vertex shader and a fragment shader
	// load shader code
	const shader_loader = await fetch("./shaders/triangle.wgsl");
	const triangle_shader = await shader_loader.text();
	const module = device.createShaderModule({
		label: 'our hardcoded rgb triangle shaders',
		code: triangle_shader,
	})

	// Create a render pipeline
	const pipeline = device.createRenderPipeline({
		label: 'our hardcoded red triangle pipeline',
		// set layout to 'auto' means to ask Webgpu to derive the layout of
		// data from the shaders, but we are not using any data for now
		layout: 'auto',
		vertex: {
			entryPoint: 'vs',
			module,
		},
		fragment: {
			entryPoint: 'fs',
			module,
			targets: [{ format: presentationFormat }],
		},
	});

	// Prepare a GPURenderPassDescriptor which describes which textures we want
	// to draw to and how to use them
	const renderPassDescriptor = {
		label: 'our basic canvas renderPass',
		colorAttachments: [
			{
				// view: <- to be filled out when we render
				clearValue: [0.3, 0.3, 0.3, 1],
				loadOp: 'clear',
				storeOp: 'store',
			},
			,]
	};


	function render() {
		// Get the current texture from the canvas context and set it as the texture
		// to render to.
		renderPassDescriptor.colorAttachments[0].view = 
			context.getCurrentTexture().createView();

		// make a command encoder to start encoding commands
		const encoder = device.createCommandEncoder({ label: 'our encoder' });

		// make a render pass encoder to encode render specific commands
		const pass = encoder.beginRenderPass(renderPassDescriptor);
		pass.setPipeline(pipeline);
		pass.draw(3); // call our vertex shader 3 times
		pass.end();

		const commandBuffer = encoder.finish();
		device.queue.submit([commandBuffer]);
	}

	const observer = new ResizeObserver(entries => {
		for (const entry of entries) {
			const canvas = entry.target;
			const width = entry.contentBoxSize[0].inlineSize;
			const height = entry.contentBoxSize[0].blockSize;
			canvas.width = Math.max(1, Math.min(width, device.limits.maxTextureDimension2D));
			canvas.height = Math.max(1, Math.min(height, device.limits.maxTextureDimension2D));
		}
		render();
	});
	observer.observe(canvas);
}


main();
