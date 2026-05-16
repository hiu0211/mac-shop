import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { publicRoutes, privateRoutes } from './Routes/index';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import { Provider } from './store/Provider';

createRoot(document.getElementById('root')).render(
    // <StrictMode>
        <Provider>
            <Router>
                <Routes>
                    {publicRoutes.map((route, index) => {
                        return <Route key={index} path={route.path} element={route.component} />;
                    })}
                    {privateRoutes.map((route, index) => {
                        return (
                            <Route key={`private-${index}`} path={route.path} element={route.component}>
                                {route.children &&
                                    route.children.map((child, childIndex) => (
                                        <Route
                                            key={`private-child-${childIndex}`}
                                            index={child.index}
                                            path={child.path}
                                            element={child.component}
                                        />
                                    ))}
                            </Route>
                        );
                    })}
                </Routes>
            </Router>
        </Provider>
    // </StrictMode>,
);
