import './App.css';
import Header from './Components/Header/Header';
import MainHome from './Components/MainHome/MainHome';
import Footer from './Components/Footer/Footer';

import Chatbot from './utils/chatbot';

function App() {
    return (
        <div className="App">
            <header>
                <Header />
            </header>
            <main>
                <MainHome />
            </main>

            <Chatbot />

            <footer>
                <Footer />
            </footer>
        </div>
    );
}

export default App;
