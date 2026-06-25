import React from 'react';
import { Sparkles, Heart, AlertCircle } from 'lucide-react';
import './CompatibilityCard.css';

/**
 * CompatibilityCard - Displays AI-generated compatibility insights between two users.
 *
 * @param {Object} props
 * @param {string} props.summary - AI-generated compatibility summary
 * @param {string[]} props.sharedInterests - List of shared interest names
 * @param {string[]} props.highlights - Key compatibility highlights
 * @param {boolean} props.sameGoal - Whether both users have the same relationship goal
 * @param {boolean} props.loading - Loading state
 * @param {string} props.error - Error message if any
 */
const CompatibilityCard = ({
    summary,
    sharedInterests = [],
    highlights = [],
    sameGoal = false,
    loading = false,
    error = null
}) => {
    // Loading state
    if (loading) {
        return (
            <div className="compatibility-card">
                <div className="compatibility-card-content">
                    <div className="compatibility-header">
                        <Sparkles className="compatibility-icon sparkle-animation" />
                        <h2 className="compatibility-title">Compatibility Insights</h2>
                    </div>
                    <div className="compatibility-loading">
                        <div className="loading-shimmer"></div>
                        <div className="loading-shimmer short"></div>
                        <div className="loading-chips">
                            <div className="loading-chip"></div>
                            <div className="loading-chip"></div>
                            <div className="loading-chip"></div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="compatibility-card error">
                <div className="compatibility-card-content">
                    <div className="compatibility-header">
                        <AlertCircle className="compatibility-icon error-icon" />
                        <h2 className="compatibility-title">Compatibility Insights</h2>
                    </div>
                    <p className="compatibility-error-text">
                        Unable to load compatibility insights at this time.
                    </p>
                </div>
            </div>
        );
    }

    // No data state
    if (!summary) {
        return null;
    }

    return (
        <div className="compatibility-card">
            <div className="compatibility-card-content">
                {/* Header */}
                <div className="compatibility-header">
                    <Sparkles className="compatibility-icon" />
                    <h2 className="compatibility-title">Compatibility Insights</h2>
                </div>

                {/* AI Summary */}
                <p className="compatibility-summary">{summary}</p>

                {/* Shared Interests */}
                {sharedInterests.length > 0 && (
                    <div className="compatibility-section">
                        <span className="compatibility-label">Shared Interests:</span>
                        <div className="compatibility-chips">
                            {sharedInterests.map((interest, index) => (
                                <span key={index} className="compatibility-chip shared">
                                    {interest}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Same Goal Badge */}
                {sameGoal && (
                    <div className="compatibility-same-goal">
                        <Heart className="same-goal-icon" />
                        <span>Same relationship goal</span>
                    </div>
                )}

                {/* Compatibility Highlights */}
                {highlights.length > 0 && (
                    <div className="compatibility-highlights">
                        {highlights.map((highlight, index) => (
                            <div key={index} className="highlight-item">
                                <span className="highlight-dot"></span>
                                <span>{highlight}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CompatibilityCard;
