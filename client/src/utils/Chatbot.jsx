import React, { useState, useRef, useEffect } from 'react';
import styles from './Chatbot.module.scss';
import { requestAskQuestion } from '../Config/request';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faComments, faTimes } from '@fortawesome/free-solid-svg-icons';

// Parse product blocks like: - **Product Name (specs)**: **15.000.000đ (giảm từ 20.000đ)**
const parseProductBlocks = (text) => {
    // capture product name and the full bolded price block (non-greedy)
    const productRegex = /-\s*\*\*(.*?)\*\*\s*[:\-–]\s*\*\*(.*?)\*\*/gi;
    const segments = [];
    let lastIndex = 0;
    let match;

    while ((match = productRegex.exec(text)) !== null) {
        if (match.index > lastIndex) {
            segments.push({ type: 'text', content: text.slice(lastIndex, match.index) });
        }
        segments.push({ type: 'product', name: match[1].trim(), price: match[2].trim() });
        lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) segments.push({ type: 'text', content: text.slice(lastIndex) });
    return segments.length ? segments : [{ type: 'text', content: text }];
};

const parseInlineMarkdown = (text) => {
    if (!text) return '';
    let out = String(text);
    out = out.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    out = out.replace(/\*([^*]+?)\*/g, '<em>$1</em>');
    return out;
};

const renderTextContent = (rawText) => {
    const lines = rawText.split('\n').filter((l) => l.trim() !== '');
    const elements = [];
    let listBuffer = [];

    const flushList = () => {
        if (listBuffer.length) {
            elements.push(
                <ul key={`ul-${elements.length}`} className={styles.parsedList}>
                    {listBuffer.map((item, i) => (
                        <li key={i} dangerouslySetInnerHTML={{ __html: parseInlineMarkdown(item) }} />
                    ))}
                </ul>
            );
            listBuffer = [];
        }
    };

    lines.forEach((line, i) => {
        const bulletMatch = line.match(/^\s*[*-]\s+(.+)/);
        if (bulletMatch) listBuffer.push(bulletMatch[1]);
        else {
            flushList();
            elements.push(
                <p key={`p-${i}`} className={styles.parsedParagraph} dangerouslySetInnerHTML={{ __html: parseInlineMarkdown(line) }} />
            );
        }
    });

    flushList();
    return elements;
};

const extractSpecs = (name) => {
    const match = name.match(/\(([^)]+)\)/);
    if (!match) return { title: name, specs: [] };
    const title = name.replace(/\s*\([^)]*\)/, '').trim();
    const specs = match[1].split('|').map((s) => s.trim()).filter(Boolean);
    return { title, specs };
};

const BotMessageContent = ({ text, productImages = {} }) => {
    const segments = parseProductBlocks(text || '');
    let productIndex = 0;

    return (
        <div className={styles.botContent}>
            {segments.map((seg, i) => {
                if (seg.type === 'product') {
                    const { title, specs } = extractSpecs(seg.name);
                    const imageUrl = productImages?.[seg.name] || productImages?.[title];
                    const isFeatured = productIndex === 0;
                    productIndex += 1;

                    return (
                        <div key={i} className={`${styles.productCard} ${isFeatured ? styles.productFeatured : ''}`}>
                            {imageUrl ? (
                                <img src={imageUrl} alt={title} className={styles.productImage} />
                            ) : (
                                <div className={styles.productImage} aria-hidden />
                            )}
                            <div className={styles.productInfo}>
                                <div className={styles.productName} dangerouslySetInnerHTML={{ __html: parseInlineMarkdown(title) }} />
                                {specs && specs.length > 0 && (
                                    <div className={styles.productSpecs}>
                                        {specs.map((s, idx) => (
                                            <span key={idx} className={styles.specTag}>{s}</span>
                                        ))}
                                    </div>
                                )}
                                <div className={styles.productPrice}>{seg.price}</div>
                            </div>
                        </div>
                    );
                }

                return (
                    <div key={i} className={styles.textBlock}>
                        {renderTextContent(seg.content)}
                    </div>
                );
            })}
        </div>
    );
};

const Chatbot = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { text: 'Xin chào! Tôi là trợ lý bán hàng. Tôi có thể giúp gì cho bạn?', sender: 'bot' },
    ]);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!inputMessage.trim() || isLoading) return;

        const userMessage = inputMessage.trim();
        setMessages((prev) => [...prev, { text: userMessage, sender: 'user' }]);
        setInputMessage('');
        setIsLoading(true);

        try {
            const res = await requestAskQuestion({ question: userMessage });
            // res can be a string or an object { text, productImages }
            let text = '';
            let productImages = {};
            if (!res) {
                text = 'Xin lỗi, không nhận được phản hồi từ server.';
            } else if (typeof res === 'string') {
                text = res;
            } else if (typeof res === 'object') {
                text = res.text || JSON.stringify(res);
                productImages = res.productImages || {};
            }

            setMessages((prev) => [...prev, { text, productImages, sender: 'bot' }]);
        } catch (error) {
            console.error('Error asking question:', error);
            setMessages((prev) => [
                ...prev,
                { text: 'Xin lỗi, tôi đang gặp sự cố. Vui lòng thử lại sau.', sender: 'bot' },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <button className={styles.chatButton} onClick={() => setIsOpen(!isOpen)} aria-label="Mở chat">
                <FontAwesomeIcon icon={faComments} />
            </button>

            {isOpen && (
                <div className={styles.chatbotContainer}>
                    <div className={styles.chatHeader}>
                        <h2>Hỗ trợ người dùng</h2>
                        <button className={styles.closeButton} onClick={() => setIsOpen(false)} aria-label="Đóng chat">
                            <FontAwesomeIcon icon={faTimes} />
                        </button>
                    </div>
                    <div className={styles.messageList}>
                        {messages.map((message, index) => (
                            <div
                                key={index}
                                className={`${styles.message} ${message.sender === 'user' ? styles.userMessage : styles.botMessage}`}
                            >
                                {message.sender === 'bot' ? (
                                    <div className={styles.messageContent}>
                                        <BotMessageContent text={message.text} productImages={message.productImages || {}} />
                                    </div>
                                ) : (
                                    <div className={styles.messageContent}>{message.text}</div>
                                )}
                            </div>
                        ))}

                        {isLoading && (
                            <div className={`${styles.message} ${styles.botMessage}`}>
                                <div className={styles.messageContent}>
                                    <span className={styles.typingIndicator}>Đang nhập...</span>
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    <form onSubmit={handleSubmit} className={styles.inputForm}>
                        <input
                            type="text"
                            value={inputMessage}
                            onChange={(e) => setInputMessage(e.target.value)}
                            placeholder="Nhập tin nhắn của bạn..."
                            className={styles.input}
                            disabled={isLoading}
                        />
                        <button type="submit" className={styles.sendButton} disabled={isLoading || !inputMessage.trim()}>
                            Gửi
                        </button>
                    </form>
                </div>
            )}
        </>
    );
};

export default Chatbot;
