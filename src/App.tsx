import "./App.css";
import styled from "styled-components";
import Canvas from "./components/Canvas/Canvas";

function App() {
  return (
    <Wrapper>
      <Canvas />
    </Wrapper>
  );
}

export default App;

const Wrapper = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  font-weight: 800;
`;
