import { sjs } from '../../src/runtime/jsx';

interface CardProps {
  title: string;
  children?: any;
}

interface TabProps {
  label: string;
  active?: boolean;
  onClick?: () => void;
}

interface TabPanelProps {
  children?: any;
  active?: boolean;
}

// Card component with children
function Card({ title, children }: CardProps) {
  return (
    <div className="card">
      <div className="card-header">
        <h3>{title}</h3>
      </div>
      <div className="card-body">
        {children}
      </div>
    </div>
  );
}

// Tab component
function Tab({ label, active, onClick }: TabProps) {
  return (
    <button
      className={`tab ${active ? 'active' : ''}`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

// TabPanel component
function TabPanel({ children, active }: TabPanelProps) {
  if (!active) return null;
  return <div className="tab-panel">{children}</div>;
}

// Main App component demonstrating fragments and composition
function App() {
  let activeTab = 0;

  function setActiveTab(index: number) {
    activeTab = index;
    renderApp();
  }

  function renderApp() {
    sjs.render(<App />, document.getElementById('app'));
  }

  return (
    <>
      <header className="app-header">
        <h1>Component Composition Demo</h1>
        <p>Demonstrating fragments and component composition in super.js</p>
      </header>

      <main className="app-content">
        <Card title="User Profile">
          <>
            <div className="profile-info">
              <img src="avatar.png" alt="User Avatar" className="avatar" />
              <div className="user-details">
                <h4>John Doe</h4>
                <p>Software Developer</p>
              </div>
            </div>
            <div className="profile-bio">
              <p>Passionate about web development and super.js!</p>
            </div>
          </>
        </Card>

        <div className="tabbed-content">
          <div className="tabs">
            <Tab
              label="Posts"
              active={activeTab === 0}
              onClick={() => setActiveTab(0)}
            />
            <Tab
              label="Projects"
              active={activeTab === 1}
              onClick={() => setActiveTab(1)}
            />
            <Tab
              label="Contact"
              active={activeTab === 2}
              onClick={() => setActiveTab(2)}
            />
          </div>

          <TabPanel active={activeTab === 0}>
            <Card title="Latest Posts">
              <ul>
                <li>Getting Started with JSX in super.js</li>
                <li>Component Composition Patterns</li>
                <li>Understanding Fragments</li>
              </ul>
            </Card>
          </TabPanel>

          <TabPanel active={activeTab === 1}>
            <Card title="Recent Projects">
              <ul>
                <li>super.js Documentation Site</li>
                <li>Task Management App</li>
                <li>Personal Portfolio</li>
              </ul>
            </Card>
          </TabPanel>

          <TabPanel active={activeTab === 2}>
            <Card title="Contact Information">
              <>
                <p>Email: john@example.com</p>
                <p>GitHub: @johndoe</p>
                <p>Twitter: @johndoe_dev</p>
              </>
            </Card>
          </TabPanel>
        </div>
      </main>

      <footer className="app-footer">
        <p>Built with super.js and JSX</p>
      </footer>
    </>
  );
}

// Initialize the app
sjs.render(<App />, document.getElementById('app')); 