from apps.api.app.services.semantic_metrics import build_summary, metric_catalog, unavailable_for_config


def record(output: str, processing: str, published: str, duration: float = 1, metadata: list[bool] | None = None) -> dict:
    return {
        "outputType": output,
        "processingStatus": processing,
        "publishedStatus": published,
        "durationMinutes": duration,
        "processingMinutes": duration,
        "metadataPresence": metadata or [False] * 6,
    }


def test_video_metrics_use_original_grain_and_exclude_unknown_from_rate() -> None:
    rows = [
        record("Original", "done", "Published"),
        record("Original", "error", "Failed"),
        record("Original", "unknown(10)", "Draft"),
        record("Viral", "done", "Published"),
    ]

    summary = build_summary(rows)

    assert summary["videosIngested"] == 3
    assert summary["generatedOutputs"] == 1
    assert summary["processingSuccessRate"] == 50
    assert summary["processingErrorRate"] == 50
    assert summary["outputYield"] == 0.33


def test_unavailable_metrics_remain_registered() -> None:
    by_id = {metric["id"]: metric for metric in metric_catalog()}

    assert by_id["downloads"]["available"] is False
    assert by_id["processingSuccessRate"]["available"] is True
    assert unavailable_for_config({"metric": "downloads"}) == {
        "downloads": "The SQL snapshot does not contain trustworthy download totals."
    }
