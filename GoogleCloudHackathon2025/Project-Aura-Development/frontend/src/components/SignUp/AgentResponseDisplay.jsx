import React from 'react';

// Shopping List Display
export const ShoppingListDisplay = ({ data }) => {
    if (!data || !data.items) return null;

    return (
        <div style={{
            marginTop: '15px',
            padding: '15px',
            background: 'rgba(76, 175, 80, 0.1)',
            borderRadius: '15px',
            border: '1px solid rgba(76, 175, 80, 0.3)'
        }}>
            <h4 style={{ color: '#4CAF50', marginBottom: '10px', fontSize: '16px', fontWeight: '700' }}>
                🛒 Shopping List - {data.category}
            </h4>

            {data.items.map((item, index) => (
                <div key={index} style={{
                    padding: '12px',
                    marginBottom: '10px',
                    background: 'white',
                    borderRadius: '10px'
                }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: '8px'
                    }}>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: '600', color: '#333' }}>
                                {item.name} <span style={{ color: '#999', fontWeight: 'normal' }}>x{item.quantity}</span>
                            </div>
                            <div style={{ fontSize: '12px', color: '#666', marginTop: '3px' }}>{item.reason}</div>
                        </div>
                        <div style={{ color: '#4CAF50', fontWeight: '600', marginLeft: '10px' }}>{item.estimated_price}</div>
                    </div>

                    {/* Shopping Links */}
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                        {item.shopee_link && (
                            <a
                                href={item.shopee_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    flex: 1,
                                    display: 'inline-block',
                                    padding: '6px 12px',
                                    background: 'linear-gradient(135deg, #EE4D2D, #FF6434)',
                                    color: 'white',
                                    textDecoration: 'none',
                                    borderRadius: '8px',
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    textAlign: 'center'
                                }}
                            >
                                🛍️ Shopee
                            </a>
                        )}
                        {item.lazada_link && (
                            <a
                                href={item.lazada_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    flex: 1,
                                    display: 'inline-block',
                                    padding: '6px 12px',
                                    background: 'linear-gradient(135deg, #0F156D, #1A1F8F)',
                                    color: 'white',
                                    textDecoration: 'none',
                                    borderRadius: '8px',
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    textAlign: 'center'
                                }}
                            >
                                🛒 Lazada
                            </a>
                        )}
                    </div>
                </div>
            ))}

            <div style={{
                marginTop: '15px',
                padding: '10px',
                background: 'rgba(255, 193, 7, 0.1)',
                borderRadius: '10px',
                fontSize: '14px'
            }}>
                <div style={{ fontWeight: '600', color: '#F57C00' }}>Total Estimate: {data.total_estimate}</div>
                {data.shopping_tips && (
                    <div style={{ marginTop: '5px', color: '#666', fontSize: '13px' }}>
                        💡 {data.shopping_tips}
                    </div>
                )}
            </div>
        </div>
    );
};

// Dating Location Display
export const LocationDisplay = ({ data }) => {
    if (!data || !data.locations) return null;

    return (
        <div style={{
            marginTop: '15px',
            padding: '15px',
            background: 'rgba(255, 127, 127, 0.1)',
            borderRadius: '15px',
            border: '1px solid rgba(255, 127, 127, 0.3)'
        }}>
            <h4 style={{ color: '#FF7F7F', marginBottom: '10px', fontSize: '16px', fontWeight: '700' }}>
                📍 Date Locations - {data.date_type}
            </h4>

            {data.locations.map((location, index) => (
                <div key={index} style={{
                    padding: '12px',
                    marginBottom: '10px',
                    background: 'white',
                    borderRadius: '10px'
                }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: '8px'
                    }}>
                        <div style={{ fontWeight: '700', color: '#333', fontSize: '15px' }}>
                            {location.name}
                        </div>
                        <div style={{
                            background: '#FFE5E5',
                            padding: '3px 10px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            color: '#FF7F7F',
                            fontWeight: '600'
                        }}>
                            {location.price_range}
                        </div>
                    </div>

                    <div style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>
                        {location.address}
                    </div>

                    <div style={{
                        display: 'flex',
                        gap: '8px',
                        marginBottom: '8px',
                        flexWrap: 'wrap'
                    }}>
                        <span style={{
                            background: '#F0F0F0',
                            padding: '3px 8px',
                            borderRadius: '8px',
                            fontSize: '11px',
                            color: '#666'
                        }}>
                            {location.type}
                        </span>
                        <span style={{
                            background: '#F0F0F0',
                            padding: '3px 8px',
                            borderRadius: '8px',
                            fontSize: '11px',
                            color: '#666'
                        }}>
                            {location.ambiance}
                        </span>
                        <span style={{
                            background: '#FFE5E5',
                            padding: '3px 8px',
                            borderRadius: '8px',
                            fontSize: '11px',
                            color: '#FF7F7F'
                        }}>
                            {location.best_for}
                        </span>
                    </div>

                    <a
                        href={location.maps_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            display: 'inline-block',
                            padding: '8px 15px',
                            background: 'linear-gradient(135deg, #FF7F7F, #FFA0A0)',
                            color: 'white',
                            textDecoration: 'none',
                            borderRadius: '20px',
                            fontSize: '12px',
                            fontWeight: '600'
                        }}
                    >
                        📍 Open in Google Maps
                    </a>
                </div>
            ))}

            {data.tips && (
                <div style={{
                    marginTop: '10px',
                    padding: '10px',
                    background: 'rgba(255, 193, 7, 0.1)',
                    borderRadius: '10px',
                    fontSize: '13px',
                    color: '#666'
                }}>
                    💡 {data.tips}
                </div>
            )}
        </div>
    );
};

// Calendar Event Display
export const CalendarEventDisplay = ({ data }) => {
    if (!data || !data.event_title) return null;

    return (
        <div style={{
            marginTop: '15px',
            padding: '15px',
            background: 'rgba(33, 150, 243, 0.1)',
            borderRadius: '15px',
            border: '1px solid rgba(33, 150, 243, 0.3)'
        }}>
            <h4 style={{ color: '#2196F3', marginBottom: '15px', fontSize: '16px', fontWeight: '700' }}>
                📅 Calendar Event
            </h4>

            <div style={{
                padding: '15px',
                background: 'white',
                borderRadius: '10px'
            }}>
                <div style={{ fontWeight: '700', color: '#333', fontSize: '18px', marginBottom: '10px' }}>
                    {data.event_title}
                </div>

                {data.event_description && (
                    <div style={{ fontSize: '14px', color: '#666', marginBottom: '12px' }}>
                        {data.event_description}
                    </div>
                )}

                <div style={{ marginBottom: '10px' }}>
                    <div style={{ fontSize: '14px', color: '#333', marginBottom: '5px' }}>
                        <strong>📅 Date:</strong> {data.start_date}
                    </div>
                    <div style={{ fontSize: '14px', color: '#333', marginBottom: '5px' }}>
                        <strong>🕐 Time:</strong> {data.start_time} ({data.duration_hours} hours)
                    </div>
                    {data.location && (
                        <div style={{ fontSize: '14px', color: '#333', marginBottom: '5px' }}>
                            <strong>📍 Location:</strong> {data.location}
                        </div>
                    )}
                    <div style={{ fontSize: '14px', color: '#333' }}>
                        <strong>🔔 Reminder:</strong> {data.reminder_minutes} minutes before
                    </div>
                </div>

                <a
                    href={data.calendar_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                        display: 'inline-block',
                        padding: '10px 20px',
                        background: 'linear-gradient(135deg, #2196F3, #64B5F6)',
                        color: 'white',
                        textDecoration: 'none',
                        borderRadius: '20px',
                        fontSize: '14px',
                        fontWeight: '600',
                        marginTop: '10px'
                    }}
                >
                    ➕ Add to Google Calendar
                </a>
            </div>
        </div>
    );
};

// Main Agent Response Renderer
export const AgentResponseRenderer = ({ agentType, agentData }) => {
    if (!agentType || !agentData) return null;

    switch (agentType) {
        case 'shopping_list':
            return <ShoppingListDisplay data={agentData} />;
        case 'dating_location':
            return <LocationDisplay data={agentData} />;
        case 'google_calendar':
            return <CalendarEventDisplay data={agentData} />;
        default:
            return null;
    }
};
