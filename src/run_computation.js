async function main() {
	// Check if browser supports WebGPU and get GPU device
	const adapter = await navigator.gpu?.requestAdapter();
	const device = await adapter?.requestDevice();
	if (!device) {
		fail('Need a browser that supports WebGPU');
		return;
	}

	// Create a shader module
	const module = device.createShaderModule({
		label: 'doubling compute model',
		code: `
			// create a type storage that can be read from and write to
			@group(0) @binding(0) var<storage, read_write> data: array<f32>;

			@compute @workgroup_size(1) fn computeSomething(
				 @builtin(global_invocation_id) id: vec3u
			) {
				let i = id.x;
				data[i] = data[i] * 2.0;
			}
		`,
	});

	// Create pipeline
	const pipeline = device.createComputePipeline({
		label: 'doubling compute pipeline',
		layout: 'auto',
		compute: {
			module,
		},
	});

	const input = new Float32Array([1, 3, 5]);

	// create a buffer on the GPU to hold our computation input and output
	const workBuffer = device.createBuffer({
		label: 'work buffer',
		size: input.byteLength,
		usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
	});

	// copy our input data to the work buffer
	device.queue.writeBuffer(workBuffer, 0, input);

	// create a buffer on the GPU to get a copy of the results
	const resultBuffer = device.createBuffer({
		label: 'result buffer',
		size: input.byteLength,
		usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
	});

	// Setup bindGroup to tell shader which buffer to use for the computation
	const bindGroup = device.createBindGroup({
		label: 'bindGroup for work buffer',
		layout: pipeline.getBindGroupLayout(0), // corresponds to the @group(0)
		entries: [
			{ binding: 0, resource: { buffer: workBuffer } },
		],
	});

	// Encode commands to do the computation
	const encoder = device.createCommandEncoder({
		label: 'doubling encoder',
	});
	const pass = encoder.beginComputePass({
		label: 'doubling compute pass',
	});
	pass.setPipeline(pipeline);
	pass.setBindGroup(0, bindGroup); // 0 corresponds to @gropu(0)
	pass.dispatchWorkgroups(input.length); // tell WebGPU to run input.length times
	pass.end();

	// Encode a command to copy the results to a mappable buffer
	encoder.copyBufferToBuffer(workBuffer, 0, resultBuffer, 0, resultBuffer.size);

	// Finish encoding and submit the commands
	const commandBuffer = encoder.finish();
	device.queue.submit([commandBuffer]);

	// Read the results
	await resultBuffer.mapAsync(GPUMapMode.READ);
	// copy result from the GPU memory resultBuffer
	const result = new Float32Array(resultBuffer.getMappedRange().slice());
	resultBuffer.unmap();

	console.log('input: ', input);
	console.log('result: ', result);
}

// function to log messages when failing
function fail(msg) {
	alert(msg);
}

main();
