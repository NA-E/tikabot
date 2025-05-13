import './App.css';
import VoiceChat from './components/VoiceChat';

function App() {
  return (
    <div className="App">
      <div className="gradient-background">
        <div className="container">
          <div className="header">
            <h1>Tikabot</h1>
            <p>Your AI voice assistant</p>
          </div>
          <VoiceChat />
          <div className="footer">
            <button className="demo-button">Get a demo</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
