import {
  GraphicsDevice,
  PostEffect,
  RenderTarget,
  SEMANTIC_POSITION,
  Shader,
  createShaderFromCode,
  Vec4,
} from "playcanvas";
import fragmentGLSL from "./glsl/fragment.glsl?raw";

export class CustomShader extends PostEffect {
  public sharpness: number;
  public readonly shader: Shader;

  constructor(graphicsDevice: GraphicsDevice, sharpness = 0.2) {
    super(graphicsDevice);

    this.sharpness = sharpness; // Range [0, 1] - 0.2 is a good default
    this.needsDepthBuffer = false;

    this.shader = createShaderFromCode(
      graphicsDevice,
      PostEffect.quadVertexShader, // vertex GLSL code
      fragmentGLSL, // fragment GLSL code
      "customShader", // unique name
      { aPosition: SEMANTIC_POSITION }, // attributes
      false // useTransformFeedback (optional)
    );
  }

  render(inputTarget: RenderTarget, outputTarget: RenderTarget, rect: Vec4) {
    const device = this.device;

    // Set uniforms
    device.scope.resolve("uColorBuffer").setValue(inputTarget.colorBuffer);
    device.scope.resolve("uSharpness").setValue(this.sharpness);
    device.scope
      .resolve("uScreenSize")
      .setValue([inputTarget.width, inputTarget.height]);

    // Draw a full-screen quad on the output target
    this.drawQuad(outputTarget, this.shader, rect);
  }

  destroy() {
    this.shader.destroy();
  }
}
